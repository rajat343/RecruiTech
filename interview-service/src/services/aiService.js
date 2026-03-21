const OpenAI = require("openai");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL || "gpt-4o";

const SYSTEM_PROMPT = `You are an expert AI interviewer for a tech recruiting platform. You conduct professional, thorough interviews that assess candidates based on their resume and the job description. 

Your interviewing style:
- Professional but warm and conversational
- Ask clear, specific questions
- Mix technical, behavioral, and situational questions
- Tailor questions to the candidate's experience level and the job requirements
- Follow up on vague or incomplete answers
- Never reveal the scoring criteria to the candidate`;

/**
 * Generate initial interview questions based on resume and job description
 */
const generateQuestions = async (resumeText, jobDescription, jobTitle, totalQuestions = 7) => {
	const prompt = `Based on the following resume and job description, generate exactly ${totalQuestions} interview questions.

JOB TITLE: ${jobTitle}

JOB DESCRIPTION:
${jobDescription}

CANDIDATE RESUME:
${resumeText}

Generate a mix of:
- 2-3 technical questions specific to the required skills
- 1-2 behavioral questions (STAR format style)
- 1-2 situational/problem-solving questions  
- 1 project-based question about their past work

Return ONLY a JSON array of objects with this exact format:
[
  {
    "question_text": "the question",
    "category": "technical|behavioral|situational|job_specific|project_based"
  }
]

Make questions progressively harder. Start with an ice-breaker about their background, then go deeper.`;

	const response = await openai.chat.completions.create({
		model: MODEL,
		messages: [
			{ role: "system", content: SYSTEM_PROMPT },
			{ role: "user", content: prompt },
		],
		temperature: 0.7,
		response_format: { type: "json_object" },
	});

	const content = response.choices[0].message.content;
	const parsed = JSON.parse(content);
	const questions = parsed.questions || parsed;

	return questions.slice(0, totalQuestions).map((q) => ({
		question_text: q.question_text,
		category: q.category,
		question_type: "initial",
	}));
};

/**
 * Evaluate a candidate's answer and decide whether to follow up
 */
const evaluateAnswer = async (question, answer, resumeText, jobDescription, conversationHistory) => {
	const historyStr = conversationHistory
		.map((h) => `Q: ${h.question}\nA: ${h.answer}`)
		.join("\n\n");

	const prompt = `You are evaluating a candidate's answer during an interview.

JOB DESCRIPTION (summary): ${jobDescription.substring(0, 500)}

CONVERSATION SO FAR:
${historyStr}

CURRENT QUESTION: ${question}
CANDIDATE'S ANSWER: ${answer}

Evaluate the answer and respond with ONLY a JSON object:
{
  "score": <number 1-10>,
  "evaluation": "<brief 1-2 sentence evaluation>",
  "needs_follow_up": <true/false>,
  "follow_up_question": "<follow-up question if needs_follow_up is true, otherwise null>",
  "follow_up_category": "<category of follow-up if applicable>"
}

Score guidelines:
- 1-3: Poor/irrelevant answer
- 4-5: Basic answer, lacks depth
- 6-7: Good answer with relevant details
- 8-9: Excellent answer with strong specifics
- 10: Outstanding, exceptional insight

Only set needs_follow_up to true if:
- The answer is vague and needs elaboration
- The candidate mentioned something interesting worth exploring
- The answer reveals a gap that should be probed`;

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
const generateFinalScore = async (questions, resumeText, jobDescription, jobTitle) => {
	const qaHistory = questions
		.filter((q) => q.candidate_answer)
		.map(
			(q, i) =>
				`Q${i + 1} [${q.category}]: ${q.question_text}\nAnswer: ${q.candidate_answer}\nScore: ${q.score}/10\nEvaluation: ${q.ai_evaluation}`
		)
		.join("\n\n");

	const prompt = `You are generating a final interview assessment.

JOB TITLE: ${jobTitle}
JOB DESCRIPTION: ${jobDescription}

CANDIDATE RESUME:
${resumeText}

INTERVIEW TRANSCRIPT:
${qaHistory}

Generate a comprehensive final assessment. Return ONLY a JSON object:
{
  "overall_score": <number 0-100>,
  "overall_feedback": "<3-5 sentence comprehensive feedback>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "improvements": ["<area 1>", "<area 2>", "<area 3>"],
  "recommendation": "strong_hire|hire|maybe|no_hire",
  "summary": "<1 sentence summary for the recruiter>"
}

Score the candidate holistically considering:
- Technical competence (40%)
- Communication skills (20%)  
- Problem-solving ability (20%)
- Cultural fit and motivation (20%)`;

	const response = await openai.chat.completions.create({
		model: MODEL,
		messages: [
			{ role: "system", content: SYSTEM_PROMPT },
			{ role: "user", content: prompt },
		],
		temperature: 0.3,
		response_format: { type: "json_object" },
	});

	return JSON.parse(response.choices[0].message.content);
};

module.exports = {
	generateQuestions,
	evaluateAnswer,
	generateFinalScore,
};
