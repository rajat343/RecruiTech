const OpenAI = require("openai");
const {
	FOCUS_PRIMARY_QUESTION_COUNT,
	BEHAVIORAL_IN_PRIMARY_WAVE,
	SECONDARY_JD_QUESTION_COUNT,
} = require("../constants/interviewLimits");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL || "gpt-4o";

const BEHAVIORAL_THEME_TAGS = `Use these themes to shape behavioral (STAR-style) questions and follow-ups (use the ideas in natural language — do not read snake_case labels aloud to the candidate):
- debugging_approach — how they troubleshoot issues
- system_design_thinking — trade-offs, scalability thinking
- cross_functional_collaboration — working with PMs, designers, or other functions
- handling_production_issues — real-world pressure, incidents, on-call, severity
- code_quality_ownership — testing, reviews, maintainability, refactoring
- project_delivery — shipping under constraints, timelines, trade-offs
- dealing_with_ambiguity — unclear or shifting requirements`;

const TECHNICAL_DEPTH_GUIDE = `For technical or role-specific questions: keep depth at a "legitimacy check" level — enough to see if the candidate has real, recent exposure to important technologies and responsibilities from the job description. Avoid trivia, puzzle-style grilling, and exhaustive architecture drills.`;

const SYSTEM_PROMPT = `You are an expert AI interviewer for a tech recruiting platform. You conduct professional, thorough interviews grounded in the job description and recruiter-provided focus areas.

Your interviewing style:
- Professional but warm and conversational
- Ask clear, specific questions tied to the role, focus areas, and job description
- ${TECHNICAL_DEPTH_GUIDE}
- When the candidate answers, notice concrete keywords and signals (tools, services, metrics, team roles, incidents, ship cycles) and use them so follow-ups feel grounded in what they actually said
- Behavioral questions should reflect how people really work: debugging, design trade-offs, cross-functional collaboration, production pressure, code quality and ownership, delivery under constraints, and ambiguous requirements
- Follow up on vague or incomplete answers when appropriate
- Never reveal the scoring criteria to the candidate`;

const formatList = (value) => {
	if (!Array.isArray(value) || value.length === 0) return "None provided";
	return value.map((v) => `- ${String(v).trim()}`).filter((v) => v !== "-").join("\n");
};

const extractQuestionsArray = (parsed) => {
	let questions = [];
	if (Array.isArray(parsed)) {
		questions = parsed;
	} else if (parsed && typeof parsed === "object") {
		if (Array.isArray(parsed.questions)) {
			questions = parsed.questions;
		} else {
			const firstArray = Object.values(parsed).find((v) => Array.isArray(v));
			if (firstArray) questions = firstArray;
		}
	}
	return questions;
};

const normalizeQuestionRows = (rawList) =>
	rawList
		.map((q) => {
			const question_text = String(
				q?.question_text ?? q?.text ?? q?.question ?? q?.content ?? ""
			).trim();
			const category = String(q?.category ?? "job_specific")
				.trim()
				.toLowerCase();
			return {
				question_text,
				category: category || "job_specific",
				question_type: "initial",
			};
		})
		.filter((q) => q.question_text.length > 0);

const runQuestionsJsonPrompt = async (userPrompt) => {
	const response = await openai.chat.completions.create({
		model: MODEL,
		messages: [
			{ role: "system", content: SYSTEM_PROMPT },
			{ role: "user", content: userPrompt },
		],
		temperature: 0.7,
		response_format: { type: "json_object" },
	});

	const content = response.choices[0].message.content;
	let parsed;
	try {
		parsed = JSON.parse(content);
	} catch (e) {
		throw new Error(`Failed to parse model JSON for questions: ${e.message}`);
	}

	const rows = normalizeQuestionRows(extractQuestionsArray(parsed));
	if (rows.length === 0) {
		throw new Error(
			"Model returned no usable questions (empty or wrong JSON shape). Check OPENAI_MODEL and logs."
		);
	}
	return rows;
};

/**
 * Build the planned question list: 5 focus+JD (exactly 3 behavioral) + 3 JD/focus depth (non-behavioral).
 * Up to 2 follow-ups may be inserted later by the session (max 10 rows total).
 */
const generateQuestions = async (
	resumeText,
	jobDescription,
	jobTitle,
	interviewFocusAreas = [],
	strengthTags = []
) => {
	if (!process.env.OPENAI_API_KEY) {
		throw new Error("OPENAI_API_KEY is not set on the interview service");
	}

	const focusAreasText = formatList(interviewFocusAreas);
	const strengthTagsText = formatList(strengthTags);
	const resumeSnippet = (resumeText || "").trim().slice(0, 4000);

	const primaryPrompt = `You are designing the FIRST part of an interview (exactly ${FOCUS_PRIMARY_QUESTION_COUNT} questions).

Ground every question in BOTH:
1) INTERVIEW FOCUS AREAS (primary — tie questions directly to these themes), and
2) JOB DESCRIPTION (role requirements, stack, responsibilities).

JOB TITLE: ${jobTitle}

JOB DESCRIPTION:
${jobDescription}

INTERVIEW FOCUS AREAS:
${focusAreasText}

CANDIDATE STRENGTH TAGS (optional context only):
${strengthTagsText}

RESUME (short context only — do not pivot the interview to generic resume trivia):
${resumeSnippet || "Not provided"}

Behavioral question themes (for the ${BEHAVIORAL_IN_PRIMARY_WAVE} behavioral items — spread across different themes where possible; weave ideas into natural STAR prompts, do not say the tag names aloud):
${BEHAVIORAL_THEME_TAGS}

Rules:
- Return exactly ${FOCUS_PRIMARY_QUESTION_COUNT} questions.
- Exactly ${BEHAVIORAL_IN_PRIMARY_WAVE} of them MUST use category "behavioral" (STAR-style), each anchored in one or more of the themes above and in the focus areas + JD.
- The other ${FOCUS_PRIMARY_QUESTION_COUNT - BEHAVIORAL_IN_PRIMARY_WAVE} must NOT be behavioral; use only: technical | situational | job_specific | project_based. Keep those at a legitimacy-check depth for JD-relevant tech — not deep interrogations.
- Do not mention that questions came from "focus areas" or "internal scoring".

Return ONLY a JSON object:
{
  "questions": [
    { "question_text": "...", "category": "behavioral|technical|situational|job_specific|project_based" }
  ]
}`;

	const secondaryPrompt = `You are designing the NEXT part of the same interview (exactly ${SECONDARY_JD_QUESTION_COUNT} questions).

These come AFTER the first ${FOCUS_PRIMARY_QUESTION_COUNT} questions. They continue from the JOB DESCRIPTION and INTERVIEW FOCUS AREAS with short, practical prompts — enough to judge whether the candidate has real exposure to important stack and responsibilities from the JD. ${TECHNICAL_DEPTH_GUIDE} Do NOT repeat typical behavioral STAR wording (those are already covered in the first block).

JOB TITLE: ${jobTitle}

JOB DESCRIPTION:
${jobDescription}

INTERVIEW FOCUS AREAS:
${focusAreasText}

CANDIDATE STRENGTH TAGS:
${strengthTagsText}

Rules:
- Return exactly ${SECONDARY_JD_QUESTION_COUNT} questions.
- None of them may use category "behavioral". Use only: technical | situational | job_specific | project_based.

Return ONLY a JSON object:
{
  "questions": [
    { "question_text": "...", "category": "technical|situational|job_specific|project_based" }
  ]
}`;

	const primary = (await runQuestionsJsonPrompt(primaryPrompt)).slice(
		0,
		FOCUS_PRIMARY_QUESTION_COUNT,
	);
	const behavioralCount = primary.filter((q) => q.category === "behavioral").length;
	if (behavioralCount !== BEHAVIORAL_IN_PRIMARY_WAVE) {
		throw new Error(
			`Primary wave must contain exactly ${BEHAVIORAL_IN_PRIMARY_WAVE} behavioral questions; got ${behavioralCount}. Retry or adjust the prompt/model.`,
		);
	}

	const secondary = (await runQuestionsJsonPrompt(secondaryPrompt)).slice(
		0,
		SECONDARY_JD_QUESTION_COUNT,
	);
	if (secondary.some((q) => q.category === "behavioral")) {
		throw new Error(
			"Secondary wave must not include behavioral questions; regenerate or adjust the model.",
		);
	}

	const withSlots = [
		...primary.map((q, i) => ({
			...q,
			focus_primary_index: i,
		})),
		...secondary.map((q) => ({
			...q,
			focus_primary_index: null,
		})),
	];

	return withSlots;
};

/**
 * Evaluate a candidate's answer and decide whether to follow up
 */
const evaluateAnswer = async (question, answer, resumeText, jobDescription, conversationHistory) => {
	const historyStr = conversationHistory
		.map((h) => `Q: ${h.question}\nA: ${h.answer}`)
		.join("\n\n");

	const prompt = `You are evaluating ONE candidate answer during an interview. Score ONLY this answer against THIS question (not the whole interview).

JOB DESCRIPTION (summary): ${jobDescription.substring(0, 500)}

CONVERSATION SO FAR:
${historyStr}

CURRENT QUESTION: ${question}
CANDIDATE'S ANSWER: ${answer}

Scoring rubric (integer 0-10):
- **0 — No answer**: empty, refusal, "I don't know" with no substance, or the response does not address what was asked at all (completely off-topic / no attempt).
- **1-3 — Weak**: minimal relevance; almost no usable technical detail or experience; missing what they did, why it mattered, or how they did it.
- **4-5 — Partial**: touches the topic but thin on specifics; little evidence of real technical depth or concrete experience tied to the question.
- **6-7 — Solid**: addresses the question with reasonable specifics; shows some technical judgment or real experience (what / why / how) aligned with the prompt.
- **8-9 — Strong**: clear, specific technical knowledge and relevant experience; explains what they did, why those choices, and how it worked in context of the question.
- **10 — Exceptional**: outstanding depth, crisp technical reasoning, and strong evidence mapped directly to every part of the question.

When judging technical or role-specific questions, reward **concrete technical knowledge** and **first-hand experience**: tools, systems, trade-offs, metrics, constraints, failures, outcomes — and whether they explain **what** they did, **why** they chose it, and **how** it played out, **as far as the question asks**.

Before scoring, scan the answer for concrete keywords and hooks you can reuse (technologies, systems, metrics, team roles, incidents, timelines, trade-offs, tools). If you propose a follow-up, it should reference those signals so the candidate feels heard.

Behavioral follow-ups (when category stays or becomes behavioral) should lean on these professional themes where relevant (ideas only, not tag names aloud):
${BEHAVIORAL_THEME_TAGS}

Evaluate the answer and respond with ONLY a JSON object:
{
  "score": <integer 0-10>,
  "evaluation": "<brief 1-2 sentence evaluation>",
  "needs_follow_up": <true/false>,
  "follow_up_question": "<follow-up question if needs_follow_up is true, otherwise null>",
  "follow_up_category": "<category of follow-up if applicable>"
}

Only set needs_follow_up to true if:
- The answer is vague and needs elaboration
- The candidate mentioned something interesting worth exploring (especially keywords you can build the next question from)
- The answer reveals a gap that should be probed

If needs_follow_up is true, follow_up_question must be one tight question that picks up on specific words or claims from the answer (or contradiction with the JD) — not a generic "tell me more."

Session policy (for your judgment): at most two follow-up questions will be used for the whole interview, and only on the earliest focus-driven questions — use needs_follow_up sparingly.`;

	const response = await openai.chat.completions.create({
		model: MODEL,
		messages: [
			{ role: "system", content: SYSTEM_PROMPT },
			{ role: "user", content: prompt },
		],
		temperature: 0.5,
		response_format: { type: "json_object" },
	});

	return JSON.parse(response.choices[0].message.content);
};

/**
 * Generate the final interview score and feedback
 */
/**
 * Sum per-question scores (0-10 each). Unanswered or unscored rows count as 0.
 * Capped at 100 (max planned rows × 10).
 */
const sumQuestionScores = (questions) => {
	let sum = 0;
	for (const q of questions || []) {
		const v = q?.score;
		if (typeof v === "number" && !Number.isNaN(v)) {
			sum += Math.max(0, Math.min(10, v));
		}
	}
	return Math.min(100, Math.round(sum));
};

const generateFinalScore = async (questions, resumeText, jobDescription, jobTitle) => {
	const overall_score = sumQuestionScores(questions);

	const qaHistory = (questions || [])
		.map((q, i) => {
			const ans = String(q.candidate_answer ?? "").trim();
			const answerLine = ans.length ? ans : "(no answer)";
			const sc =
				typeof q.score === "number" && !Number.isNaN(q.score)
					? Math.max(0, Math.min(10, q.score))
					: 0;
			return `Q${i + 1} [${q.category || "unknown"}]: ${q.question_text}\nAnswer: ${answerLine}\nScore (0-10, locked for this report): ${sc}/10\nEvaluation: ${q.ai_evaluation || "—"}`;
		})
		.join("\n\n");

	const prompt = `You are writing the narrative parts of a final interview report.

IMPORTANT: The **overall numeric score is NOT your job**. It has already been computed as the **sum of per-question scores (each 0-10)** for every interview question row (unanswered = 0). That total is **${overall_score}** out of a maximum of 100. Do **not** invent a different overall score in your text; refer to performance qualitatively.

JOB TITLE: ${jobTitle}
JOB DESCRIPTION: ${jobDescription}

CANDIDATE RESUME:
${resumeText}

FULL QUESTION LIST (including unanswered questions — score 0 means no substantive answer):
${qaHistory || "No questions on record."}

Return ONLY a JSON object (no overall_score field):
{
  "overall_feedback": "<3-5 sentence comprehensive feedback that aligns with the per-question scores above>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "improvements": ["<area 1>", "<area 2>", "<area 3>"],
  "recommendation": "strong_hire|hire|maybe|no_hire",
  "summary": "<1 sentence summary for the recruiter>"
}`;

	const response = await openai.chat.completions.create({
		model: MODEL,
		messages: [
			{ role: "system", content: SYSTEM_PROMPT },
			{ role: "user", content: prompt },
		],
		temperature: 0.3,
		response_format: { type: "json_object" },
	});

	const parsed = JSON.parse(response.choices[0].message.content);
	return {
		overall_score,
		overall_feedback: parsed.overall_feedback,
		strengths: parsed.strengths || [],
		improvements: parsed.improvements || [],
		recommendation: parsed.recommendation,
		summary: parsed.summary,
	};
};

module.exports = {
	generateQuestions,
	evaluateAnswer,
	generateFinalScore,
	sumQuestionScores,
};
