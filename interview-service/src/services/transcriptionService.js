const fs = require("fs");
const path = require("path");
const os = require("os");
const OpenAI = require("openai");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Transcribe an audio buffer (webm/opus blob from MediaRecorder) using Whisper.
 * @param {Buffer} audioBuffer - The audio data
 * @param {string} [mimeType="audio/webm"] - MIME type of the audio
 * @returns {Promise<string>} - Transcribed text
 */
const transcribeAudio = async (audioBuffer, mimeType = "audio/webm") => {
	const ext = mimeType.includes("wav") ? "wav" : mimeType.includes("mp4") ? "mp4" : "webm";
	const tmpPath = path.join(os.tmpdir(), `whisper-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`);

	try {
		fs.writeFileSync(tmpPath, audioBuffer);

		const fileStream = fs.createReadStream(tmpPath);
		const response = await openai.audio.transcriptions.create({
			model: "whisper-1",
			file: fileStream,
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
