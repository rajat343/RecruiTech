import os
import httpx
from crewai.tools import BaseTool


class GitHubGraphQLTool(BaseTool):
    name: str = "GitHub GraphQL API"
    description: str = (
        "Fetches structured data about a GitHub user profile using GitHub's GraphQL API. "
        "Pass a GitHub username (e.g. 'torvalds') and get back profile info, "
        "top repositories with full language breakdowns, repo topics, and contribution stats."
    )

    def _run(self, username: str) -> str:
        token = os.getenv("GITHUB_TOKEN")
        if not token:
            return "Error: GITHUB_TOKEN not set in environment."

        query = """
        query ($login: String!) {
            user(login: $login) {
                name
                bio
                location
                company
                followers { totalCount }
                following { totalCount }
                repositories(first: 10, orderBy: {field: STARGAZERS, direction: DESC}, ownerAffiliations: OWNER) {
                    totalCount
                    nodes {
                        name
                        description
                        stargazerCount
                        forkCount
                        primaryLanguage { name }
                        url
                        repositoryTopics(first: 10) {
                            nodes {
                                topic { name }
                            }
                        }
                        languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
                            edges {
                                size
                                node { name }
                            }
                            totalSize
                        }
                    }
                }
                contributionsCollection {
                    totalCommitContributions
                    totalPullRequestContributions
                    totalIssueContributions
                    totalRepositoryContributions
                }
            }
        }
        """

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

        response = httpx.post(
            "https://api.github.com/graphql",
            json={"query": query, "variables": {"login": username}},
            headers=headers,
        )

        if response.status_code != 200:
            return f"Error: GitHub API returned status {response.status_code}: {response.text}"

        data = response.json()

        if "errors" in data:
            return f"Error: {data['errors'][0]['message']}"

        user = data["data"]["user"]
        if user is None:
            return f"Error: User '{username}' not found on GitHub."

        # Format as structured text for the LLM
        lines = [
            f"# GitHub Profile: {user['name'] or username}",
            f"- Bio: {user.get('bio') or 'N/A'}",
            f"- Location: {user.get('location') or 'N/A'}",
            f"- Company: {user.get('company') or 'N/A'}",
            f"- Followers: {user['followers']['totalCount']}",
            f"- Following: {user['following']['totalCount']}",
            f"- Total Public Repos: {user['repositories']['totalCount']}",
            "",
            "## Contributions (last year)",
            f"- Commits: {user['contributionsCollection']['totalCommitContributions']}",
            f"- Pull Requests: {user['contributionsCollection']['totalPullRequestContributions']}",
            f"- Issues: {user['contributionsCollection']['totalIssueContributions']}",
            f"- Repositories Created: {user['contributionsCollection']['totalRepositoryContributions']}",
            "",
            "## Top Repositories (by stars)",
        ]

        for repo in user["repositories"]["nodes"]:
            primary_lang = repo["primaryLanguage"]["name"] if repo["primaryLanguage"] else "N/A"
            desc = repo["description"] or "No description"
            lines.append(
                f"\n### {repo['name']} ({primary_lang}) - {repo['stargazerCount']} stars, "
                f"{repo['forkCount']} forks"
            )
            lines.append(f"  - Description: {desc}")
            lines.append(f"  - URL: {repo['url']}")

            # Topics
            topics = [t["topic"]["name"] for t in repo["repositoryTopics"]["nodes"]]
            if topics:
                lines.append(f"  - Topics: {', '.join(topics)}")

            # Language breakdown
            total_size = repo["languages"]["totalSize"]
            if total_size > 0:
                lang_parts = []
                for edge in repo["languages"]["edges"]:
                    pct = round(edge["size"] / total_size * 100, 1)
                    lang_parts.append(f"{edge['node']['name']} {pct}%")
                lines.append(f"  - Languages: {', '.join(lang_parts)}")

        return "\n".join(lines)
