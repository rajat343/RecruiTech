import httpx
from crewai.tools import BaseTool

LEETCODE_GRAPHQL_URL = "https://leetcode.com/graphql/"
HEADERS = {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
}


def extract_leetcode_username(leetcode_url: str) -> str:
    """Extract username from URL like 'https://leetcode.com/u/neal_wu' or 'https://leetcode.com/neal_wu'."""
    path = leetcode_url.rstrip("/").split("/")
    if "u" in path:
        return path[path.index("u") + 1]
    return path[-1]


class LeetCodeGraphQLTool(BaseTool):
    name: str = "LeetCode GraphQL API"
    description: str = (
        "Fetches structured data about a LeetCode user profile using LeetCode's GraphQL API. "
        "Pass a LeetCode username (e.g. 'neal_wu') and get back problem-solving stats, "
        "contest rating, language stats, badges, streaks, and recent submissions."
    )

    def _run(self, username: str) -> str:
        profile_data = self._fetch_profile(username)
        contest_data = self._fetch_contest(username)
        submissions_data = self._fetch_recent_submissions(username)

        if isinstance(profile_data, str) and profile_data.startswith("Error"):
            return profile_data

        return self._format_output(username, profile_data, contest_data, submissions_data)

    def _fetch_profile(self, username: str):
        query = """
        query userPublicProfile($username: String!) {
            matchedUser(username: $username) {
                username
                profile {
                    realName
                    aboutMe
                    ranking
                }
                submitStatsGlobal {
                    acSubmissionNum {
                        difficulty
                        count
                    }
                }
                badges {
                    displayName
                }
                userCalendar {
                    streak
                    totalActiveDays
                }
                languageProblemCount {
                    languageName
                    problemsSolved
                }
            }
        }
        """
        response = httpx.post(
            LEETCODE_GRAPHQL_URL,
            json={"query": query, "variables": {"username": username}},
            headers=HEADERS,
        )

        if response.status_code != 200:
            return f"Error: LeetCode API returned status {response.status_code}"

        data = response.json()
        if "errors" in data:
            return f"Error: {data['errors'][0]['message']}"

        user = data.get("data", {}).get("matchedUser")
        if user is None:
            return f"Error: User '{username}' not found on LeetCode."

        return user

    def _fetch_contest(self, username: str):
        query = """
        query userContestRankingInfo($username: String!) {
            userContestRanking(username: $username) {
                rating
                globalRanking
                totalParticipants
                topPercentage
                attendedContestsCount
            }
        }
        """
        response = httpx.post(
            LEETCODE_GRAPHQL_URL,
            json={"query": query, "variables": {"username": username}},
            headers=HEADERS,
        )

        if response.status_code != 200:
            return None

        data = response.json()
        return data.get("data", {}).get("userContestRanking")

    def _fetch_recent_submissions(self, username: str):
        query = """
        query recentSubmissions($username: String!, $limit: Int!) {
            recentAcSubmissionList(username: $username, limit: $limit) {
                title
                lang
                timestamp
            }
        }
        """
        response = httpx.post(
            LEETCODE_GRAPHQL_URL,
            json={"query": query, "variables": {"username": username, "limit": 10}},
            headers=HEADERS,
        )

        if response.status_code != 200:
            return None

        data = response.json()
        return data.get("data", {}).get("recentAcSubmissionList")

    def _format_output(self, username, profile, contest, submissions):
        p = profile.get("profile", {})
        lines = [
            f"# LeetCode Profile: {p.get('realName') or username}",
            f"- About: {p.get('aboutMe') or 'N/A'}",
            f"- Ranking: {p.get('ranking', 'N/A')}",
        ]

        # Problems solved
        stats = profile.get("submitStatsGlobal", {}).get("acSubmissionNum", [])
        lines.append("\n## Problems Solved")
        for s in stats:
            lines.append(f"- {s['difficulty']}: {s['count']}")

        # Contest performance
        lines.append("\n## Contest Performance")
        if contest:
            lines.append(f"- Rating: {round(contest.get('rating', 0))}")
            lines.append(f"- Global Ranking: {contest.get('globalRanking', 'N/A')} / {contest.get('totalParticipants', 'N/A')}")
            lines.append(f"- Top: {round(contest.get('topPercentage', 0), 1)}%")
            lines.append(f"- Contests Attended: {contest.get('attendedContestsCount', 0)}")
        else:
            lines.append("- No contest participation data available.")

        # Language stats
        lang_stats = profile.get("languageProblemCount", [])
        if lang_stats:
            lines.append("\n## Language Stats")
            for lang in sorted(lang_stats, key=lambda x: x["problemsSolved"], reverse=True):
                if lang["problemsSolved"] > 0:
                    lines.append(f"- {lang['languageName']}: {lang['problemsSolved']} problems")

        # Badges
        badges = profile.get("badges", [])
        if badges:
            lines.append("\n## Badges")
            lines.append(", ".join(b["displayName"] for b in badges))

        # Activity
        calendar = profile.get("userCalendar", {})
        if calendar:
            lines.append("\n## Activity")
            lines.append(f"- Current Streak: {calendar.get('streak', 0)} days")
            lines.append(f"- Total Active Days: {calendar.get('totalActiveDays', 0)}")

        # Recent submissions
        if submissions:
            lines.append("\n## Recent Accepted Submissions")
            for sub in submissions[:10]:
                lines.append(f"- {sub['title']} ({sub['lang']})")

        return "\n".join(lines)
