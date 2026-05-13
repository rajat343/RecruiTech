/** localStorage: last acknowledged application_count per job (recruiter + job). */

export const jobApplicationsSeenKey = (userId, jobId) =>
	`recruitech_job_apps_seen_${String(userId)}_${String(jobId)}`;

const notifInitSentinelKey = (userId) =>
	`recruitech_recruiter_notif_init_${String(userId)}`;

/**
 * First time we see this recruiter with jobs, treat current counts as baseline
 * so we do not flash historical applicants as "new".
 */
export function ensureRecruiterNotifBaseline(userId, jobs) {
	if (!userId || !jobs?.length) return;
	const sentinel = notifInitSentinelKey(userId);
	if (localStorage.getItem(sentinel)) return;
	try {
		for (const j of jobs) {
			localStorage.setItem(
				jobApplicationsSeenKey(userId, j.id),
				String(j.application_count ?? 0)
			);
		}
		localStorage.setItem(sentinel, "1");
	} catch {
		/* ignore */
	}
}

export function computeUnseenApplicationCount(userId, jobs) {
	if (!userId || !jobs?.length) return 0;
	let total = 0;
	try {
		for (const j of jobs) {
			const raw = localStorage.getItem(jobApplicationsSeenKey(userId, j.id));
			const seen =
				raw === null || raw === "" ? 0 : parseInt(raw, 10);
			const seenSafe = Number.isFinite(seen) ? seen : 0;
			const count = j.application_count ?? 0;
			total += Math.max(0, count - seenSafe);
		}
	} catch {
		return 0;
	}
	return total;
}

export function markAllRecruiterJobApplicationsSeen(userId, jobs) {
	if (!userId || !jobs?.length) return;
	try {
		for (const j of jobs) {
			localStorage.setItem(
				jobApplicationsSeenKey(userId, j.id),
				String(j.application_count ?? 0)
			);
		}
	} catch {
		/* ignore */
	}
}

export function markJobApplicationsSeen(userId, jobId, applicationCount) {
	if (!userId || !jobId) return;
	try {
		localStorage.setItem(
			jobApplicationsSeenKey(userId, jobId),
			String(applicationCount ?? 0)
		);
	} catch {
		/* ignore */
	}
}
