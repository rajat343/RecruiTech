const fs = require("fs");
const path = require("path");
const os = require("os");
const OpenAI = require("openai");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Transcribe an audio buffer using Whisper.
 * Each buffer should be a complete, self-contained webm file (not a fragment).
 */
const transcribeAudio = async (audioBuffer) => {
	const tmpPath = path.join(
		os.tmpdir(),
		`whisper-${Date.now()}-${Math.random().toString(36).slice(2)}.webm`
	);

	try {
		fs.writeFileSync(tmpPath, audioBuffer);

		const response = await openai.audio.transcriptions.create({
			model: "whisper-1",
			file: fs.createReadStream(tmpPath),
			language: "en",
			response_format: "text",
		});

		return typeof response === "string" ? response.trim() : response.text?.trim() || "";
	} finally {
		try {
			fs.unlinkSync(tmpPath);
		} catch {
			// cleanup failure is non-critical
		}
	}
};

module.exports = { transcribeAudio };
