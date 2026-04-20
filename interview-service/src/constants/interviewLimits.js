/**
 * Planned interview shape (all rows in `interview.questions` count toward the cap):
 * - First wave: focus areas + JD — FOCUS_PRIMARY_QUESTION_COUNT questions,
 *   exactly BEHAVIORAL_IN_PRIMARY_WAVE of them must be category "behavioral".
 * - Second wave: JD + focus (deeper / technical / situational) — SECONDARY_JD_QUESTION_COUNT,
 *   not behavioral (behavioral quota is only in the first wave).
 * - Follow-ups: at most MAX_FOLLOW_UPS_TOTAL for the whole session, each attached
 *   to a different one of the first-wave questions (focus_primary_index 0..4).
 */
const FOCUS_PRIMARY_QUESTION_COUNT = 5;
const BEHAVIORAL_IN_PRIMARY_WAVE = 3;
const SECONDARY_JD_QUESTION_COUNT = 3;
const MAX_FOLLOW_UPS_TOTAL = 2;

const MAX_TOTAL_INTERVIEW_QUESTIONS =
	FOCUS_PRIMARY_QUESTION_COUNT + SECONDARY_JD_QUESTION_COUNT + MAX_FOLLOW_UPS_TOTAL;

module.exports = {
	FOCUS_PRIMARY_QUESTION_COUNT,
	BEHAVIORAL_IN_PRIMARY_WAVE,
	SECONDARY_JD_QUESTION_COUNT,
	MAX_FOLLOW_UPS_TOTAL,
	MAX_TOTAL_INTERVIEW_QUESTIONS,
};
