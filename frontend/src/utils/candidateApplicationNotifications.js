/**
 * Candidate-side application updates: compares current GraphQL data to a
 * per-application fingerprint in localStorage so the navbar bell only bumps
 * when status or interview-related fields change.
 */

const baselineKey = (userId) => `recruitech_candidate_notif_init_${String(userId)}`;
const snapKey = (userId) => `recruitech_candidate_app_snap_${String(userId)}`;

const buildInterviewByApplicationId = (interviews) => {
	const m = {};
	for (const iv of interviews || []) {
		if (iv?.application_id) m[String(iv.application_id)] = iv;
	}
	return m;
};

/** Single string per application: app status + timestamps + interview state. */
export const fingerprintApplication = (app, interviewByAppId) => {
	const iv = interviewByAppId[String(app.id)] || null;
	const ivPart = iv
		? `${iv.status}|${Boolean(iv.results_released)}|${iv.overall_score ?? ""}|${iv.completed_at ?? ""}`
		: "none";
	return `${app.status}|${app.updatedAt || ""}|${app.createdAt || ""}|${ivPart}`;
};

/**
 * First session: record current fingerprints so historical rows do not count as "new".
 */
export function ensureCandidateNotifBaseline(userId, applications, interviews) {
	if (!userId) return;
	if (typeof localStorage === "undefined") return;
	if (localStorage.getItem(baselineKey(userId))) return;

	const interviewByApp = buildInterviewByApplicationId(interviews);
	const map = {};
	for (const app of applications || []) {
		map[String(app.id)] = fingerprintApplication(app, interviewByApp);
	}
	try {
		localStorage.setItem(snapKey(userId), JSON.stringify(map));
		localStorage.setItem(baselineKey(userId), "1");
	} catch {
		/* ignore */
	}
}

export function computeUnseenCandidateApplicationCount(userId, applications, interviews) {
	if (!userId || typeof localStorage === "undefined") return 0;
	if (!localStorage.getItem(baselineKey(userId))) return 0;

	let stored = {};
	try {
		stored = JSON.parse(localStorage.getItem(snapKey(userId)) || "{}");
	} catch {
		stored = {};
	}

	const interviewByApp = buildInterviewByApplicationId(interviews);
	let count = 0;
	for (const app of applications || []) {
		const id = String(app.id);
		const fp = fingerprintApplication(app, interviewByApp);
		if (stored[id] !== fp) count += 1;
	}
	return count;
}

export function markAllCandidateApplicationsSeen(userId, applications, interviews) {
	if (!userId || typeof localStorage === "undefined") return;
	const interviewByApp = buildInterviewByApplicationId(interviews);
	const map = {};
	for (const app of applications || []) {
		map[String(app.id)] = fingerprintApplication(app, interviewByApp);
	}
	try {
		localStorage.setItem(snapKey(userId), JSON.stringify(map));
		if (!localStorage.getItem(baselineKey(userId))) {
			localStorage.setItem(baselineKey(userId), "1");
		}
	} catch {
		/* ignore */
	}
}
