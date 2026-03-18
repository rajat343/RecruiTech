import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import {
	Video,
	VideoOff,
	Mic,
	MicOff,
	PhoneOff,
	MessageSquare,
	Bot,
	Clock,
	CheckCircle,
	AlertCircle,
	Loader,
	Star,
	TrendingUp,
	TrendingDown,
	Send,
	X,
	LogOut,
	Radio,
} from "lucide-react";
import "./InterviewRoom.css";

const INTERVIEW_SERVICE_URL =
	import.meta.env.VITE_INTERVIEW_SERVICE_URL || "http://localhost:5000";

const AUDIO_CHUNK_INTERVAL = 6000;

const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

const InterviewRoom = () => {
	const { token: interviewToken } = useParams();
	const { token: authToken } = useAuth();
	const navigate = useNavigate();

	const [status, setStatus] = useState("connecting");
	const [jobTitle, setJobTitle] = useState("");
	const [currentQuestion, setCurrentQuestion] = useState(null);
	const [totalQuestions, setTotalQuestions] = useState(0);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [isRecording, setIsRecording] = useState(false);
	const [transcript, setTranscript] = useState("");
	const [statusMessage, setStatusMessage] = useState("");
	const [videoEnabled, setVideoEnabled] = useState(true);
	const [audioEnabled, setAudioEnabled] = useState(true);
	const [results, setResults] = useState(null);
	const [errorMessage, setErrorMessage] = useState("");
	const [previousFeedback, setPreviousFeedback] = useState(null);
	const [answeredQuestions, setAnsweredQuestions] = useState([]);
	const [elapsedTime, setElapsedTime] = useState(0);
	const [manualInput, setManualInput] = useState("");
	const [showEndConfirm, setShowEndConfirm] = useState(false);
	const [webrtcConnected, setWebrtcConnected] = useState(false);
	const [isTranscribing, setIsTranscribing] = useState(false);

	const videoRef = useRef(null);
	const streamRef = useRef(null);
	const socketRef = useRef(null);
	const timerRef = useRef(null);
	const peerConnectionRef = useRef(null);
	const audioRecorderRef = useRef(null);
	const videoRecorderRef = useRef(null);
	const videoChunksRef = useRef([]);
	const interviewIdRef = useRef(null);

	// ─── Media: getUserMedia ───
	const initializeMedia = useCallback(async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				video: true,
				audio: true,
			});
			streamRef.current = stream;
			if (videoRef.current) {
				videoRef.current.srcObject = stream;
			}
			return stream;
		} catch (err) {
			console.warn("Camera/mic access denied:", err);
			setVideoEnabled(false);
			setAudioEnabled(false);
			return null;
		}
	}, []);

	// ─── WebRTC: create peer connection and negotiate with server ───
	const setupWebRTC = useCallback(async (socket, stream) => {
		if (!stream) return;

		const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
		peerConnectionRef.current = pc;

		stream.getTracks().forEach((track) => {
			pc.addTrack(track, stream);
		});

		pc.onicecandidate = (event) => {
			if (event.candidate) {
				socket.emit("webrtc-ice-candidate", {
					candidate: event.candidate.candidate,
					sdpMid: event.candidate.sdpMid,
					sdpMLineIndex: event.candidate.sdpMLineIndex,
				});
			}
		};

		pc.onconnectionstatechange = () => {
			if (pc.connectionState === "connected") {
				setWebrtcConnected(true);
				console.log("WebRTC peer connection established");
			}
			if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
				setWebrtcConnected(false);
			}
		};

		socket.on("webrtc-answer", async ({ sdp, type }) => {
			try {
				await pc.setRemoteDescription(new RTCSessionDescription({ sdp, type }));
			} catch (err) {
				console.error("Failed to set remote description:", err);
			}
		});

		socket.on("webrtc-ice-candidate", async ({ candidate, sdpMid, sdpMLineIndex }) => {
			try {
				if (candidate) {
					await pc.addIceCandidate(
						new RTCIceCandidate({ candidate, sdpMid, sdpMLineIndex })
					);
				}
			} catch (err) {
				console.error("Failed to add ICE candidate:", err);
			}
		});

		socket.on("webrtc-audio-connected", () => {
			setWebrtcConnected(true);
		});

		try {
			const offer = await pc.createOffer();
			await pc.setLocalDescription(offer);
			socket.emit("webrtc-offer", { sdp: offer.sdp, type: offer.type });
		} catch (err) {
			console.error("Failed to create WebRTC offer:", err);
		}
	}, []);

	// ─── MediaRecorder: audio chunks for Whisper transcription ───
	const startAudioRecording = useCallback((socket, stream) => {
		if (!stream) return;

		const audioStream = new MediaStream(stream.getAudioTracks());
		const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
			? "audio/webm;codecs=opus"
			: "audio/webm";

		const recorder = new MediaRecorder(audioStream, { mimeType });

		recorder.ondataavailable = (event) => {
			if (event.data.size > 0 && socket.connected) {
				setIsTranscribing(true);
				event.data.arrayBuffer().then((buffer) => {
					socket.emit("audio-chunk", buffer);
				});
			}
		};

		audioRecorderRef.current = recorder;
		return recorder;
	}, []);

	// ─── MediaRecorder: full video recording for recruiter replay ───
	const startVideoRecording = useCallback((stream) => {
		if (!stream) return;

		const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
			? "video/webm;codecs=vp9,opus"
			: "video/webm";

		const recorder = new MediaRecorder(stream, { mimeType });
		videoChunksRef.current = [];

		recorder.ondataavailable = (event) => {
			if (event.data.size > 0) {
				videoChunksRef.current.push(event.data);
			}
		};

		recorder.start();
		videoRecorderRef.current = recorder;
	}, []);

	// ─── Upload recording at interview end ───
	const uploadRecording = useCallback(async () => {
		if (videoChunksRef.current.length === 0 || !interviewIdRef.current) return;

		try {
			const blob = new Blob(videoChunksRef.current, { type: "video/webm" });
			const formData = new FormData();
			formData.append("recording", blob, "interview-recording.webm");

			await axios.post(
				`${INTERVIEW_SERVICE_URL}/api/interviews/${interviewIdRef.current}/recording`,
				formData,
				{
					headers: {
						"Content-Type": "multipart/form-data",
						Authorization: `Bearer ${authToken}`,
					},
				}
			);
			console.log("Interview recording uploaded");
		} catch (err) {
			console.error("Failed to upload recording:", err);
		}
	}, [authToken]);

	// ─── Socket.IO connection ───
	const connectSocket = useCallback(async () => {
		const { io } = await import("socket.io-client");

		const socket = io(INTERVIEW_SERVICE_URL, {
			auth: { token: authToken },
			transports: ["websocket", "polling"],
		});

		socket.on("connect", () => {
			console.log("Socket connected");
			socket.emit("join-interview", { interviewToken });
		});

		socket.on("connect_error", (err) => {
			console.error("Socket connection error:", err.message);
			setStatus("error");
			setErrorMessage("Failed to connect to interview service");
		});

		socket.on("capabilities", async () => {
			const stream = streamRef.current;
			if (stream) {
				await setupWebRTC(socket, stream);
			}
		});

		socket.on("transcription", ({ text }) => {
			setIsTranscribing(false);
			if (text) {
				setTranscript((prev) => (prev ? prev + " " + text : text));
			}
		});

		socket.on("interview-started", (data) => {
			setStatus("in_progress");
			setJobTitle(data.jobTitle || "");
			setTotalQuestions(data.totalQuestions);
			setCurrentIndex(data.currentQuestionIndex);
			setCurrentQuestion(data.question);
			setStatusMessage("");
			interviewIdRef.current = data.interviewId;

			const stream = streamRef.current;
			if (stream) {
				startVideoRecording(stream);
			}

			timerRef.current = setInterval(() => {
				setElapsedTime((prev) => prev + 1);
			}, 1000);
		});

		socket.on("interview-already-completed", (data) => {
			setStatus("completed");
			setResults(data);
		});

		socket.on("new-question", (data) => {
			setCurrentQuestion(data.question);
			setCurrentIndex(data.currentQuestionIndex);
			setTotalQuestions(data.totalQuestions);
			setTranscript("");
			setStatusMessage("");
			if (data.previousEvaluation) {
				setPreviousFeedback(data.previousEvaluation);
				setAnsweredQuestions((prev) => [
					...prev,
					{ score: data.previousEvaluation.score },
				]);
				setTimeout(() => setPreviousFeedback(null), 4000);
			}
		});

		socket.on("follow-up-question", (data) => {
			setCurrentQuestion(data.question);
			setCurrentIndex(data.currentQuestionIndex);
			setTotalQuestions(data.totalQuestions);
			setTranscript("");
			setStatusMessage("");
			if (data.previousEvaluation) {
				setPreviousFeedback(data.previousEvaluation);
				setTimeout(() => setPreviousFeedback(null), 4000);
			}
		});

		socket.on("status-update", (data) => {
			setStatusMessage(data.message);
		});

		socket.on("interview-complete", async (data) => {
			setStatus("completed");
			setResults(data);
			if (timerRef.current) clearInterval(timerRef.current);

			if (videoRecorderRef.current && videoRecorderRef.current.state !== "inactive") {
				videoRecorderRef.current.stop();
			}
			if (audioRecorderRef.current && audioRecorderRef.current.state !== "inactive") {
				audioRecorderRef.current.stop();
			}

			await uploadRecording();
		});

		socket.on("error", (data) => {
			setErrorMessage(data.message);
			if (data.message === "Interview not found" || data.message === "Unauthorized") {
				setStatus("error");
			}
		});

		socketRef.current = socket;
	}, [authToken, interviewToken, setupWebRTC, startVideoRecording, uploadRecording]);

	useEffect(() => {
		const init = async () => {
			await initializeMedia();
			await connectSocket();
		};
		init();

		return () => {
			if (socketRef.current) socketRef.current.disconnect();
			if (streamRef.current) {
				streamRef.current.getTracks().forEach((t) => t.stop());
			}
			if (peerConnectionRef.current) {
				peerConnectionRef.current.close();
			}
			if (audioRecorderRef.current && audioRecorderRef.current.state !== "inactive") {
				audioRecorderRef.current.stop();
			}
			if (videoRecorderRef.current && videoRecorderRef.current.state !== "inactive") {
				videoRecorderRef.current.stop();
			}
			if (timerRef.current) clearInterval(timerRef.current);
		};
	}, [initializeMedia, connectSocket]);

	// ─── Mic: start/stop audio recording & streaming chunks to server ───
	const startListening = () => {
		const socket = socketRef.current;
		const stream = streamRef.current;
		if (!socket || !stream) return;

		let recorder = audioRecorderRef.current;
		if (!recorder || recorder.state === "inactive") {
			recorder = startAudioRecording(socket, stream);
		}
		if (recorder) {
			recorder.start(AUDIO_CHUNK_INTERVAL);
			setIsRecording(true);
		}
	};

	const stopListening = () => {
		setIsRecording(false);
		if (audioRecorderRef.current && audioRecorderRef.current.state !== "inactive") {
			audioRecorderRef.current.stop();
		}
	};

	const submitAnswer = () => {
		const answer = transcript.trim();
		if (!answer || !socketRef.current) return;

		stopListening();
		socketRef.current.emit("candidate-answer", { answer });
		setStatusMessage("Processing your answer...");
	};

	const submitManualAnswer = () => {
		const answer = manualInput.trim();
		if (!answer || !socketRef.current) return;

		socketRef.current.emit("candidate-answer", { answer });
		setManualInput("");
		setStatusMessage("Processing your answer...");
	};

	const endInterview = () => {
		if (socketRef.current) {
			socketRef.current.emit("end-interview");
			setStatusMessage("Wrapping up your interview...");
		}
		setShowEndConfirm(false);
	};

	const leaveInterview = () => {
		if (socketRef.current) socketRef.current.disconnect();
		if (streamRef.current) {
			streamRef.current.getTracks().forEach((t) => t.stop());
		}
		if (peerConnectionRef.current) peerConnectionRef.current.close();
		if (timerRef.current) clearInterval(timerRef.current);
		navigate("/candidate/jobs");
	};

	const toggleVideo = () => {
		if (streamRef.current) {
			const videoTrack = streamRef.current.getVideoTracks()[0];
			if (videoTrack) {
				videoTrack.enabled = !videoTrack.enabled;
				setVideoEnabled(videoTrack.enabled);
			}
		}
	};

	const toggleAudio = () => {
		if (streamRef.current) {
			const audioTrack = streamRef.current.getAudioTracks()[0];
			if (audioTrack) {
				audioTrack.enabled = !audioTrack.enabled;
				setAudioEnabled(audioTrack.enabled);
			}
		}
	};

	const formatTime = (seconds) => {
		const m = Math.floor(seconds / 60);
		const s = seconds % 60;
		return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
	};

	if (status === "error") {
		return (
			<div className="interview-room">
				<div className="interview-error">
					<AlertCircle size={64} />
					<h2>Unable to Start Interview</h2>
					<p>{errorMessage || "Something went wrong"}</p>
					<button className="btn btn-primary" onClick={() => navigate("/candidate/jobs")}>
						Back to Jobs
					</button>
				</div>
			</div>
		);
	}

	if (status === "completed" && results) {
		return (
			<div className="interview-room">
				<div className="interview-results">
					<div className="results-header">
						<CheckCircle size={48} className="results-icon" />
						<h2>Interview Complete</h2>
						{jobTitle && <p className="results-job-title">{jobTitle}</p>}
					</div>

					<div className="score-circle">
						<svg viewBox="0 0 120 120">
							<circle cx="60" cy="60" r="54" className="score-bg" />
							<circle
								cx="60"
								cy="60"
								r="54"
								className="score-fill"
								style={{
									strokeDasharray: `${(results.overall_score / 100) * 339.3} 339.3`,
								}}
							/>
						</svg>
						<div className="score-value">
							<span className="score-number">{Math.round(results.overall_score)}</span>
							<span className="score-label">/ 100</span>
						</div>
					</div>

					<p className="results-feedback">{results.overall_feedback}</p>

					{results.strengths?.length > 0 && (
						<div className="results-section">
							<h3>
								<TrendingUp size={18} /> Strengths
							</h3>
							<ul>
								{results.strengths.map((s, i) => (
									<li key={i}>{s}</li>
								))}
							</ul>
						</div>
					)}

					{results.improvements?.length > 0 && (
						<div className="results-section improvements">
							<h3>
								<TrendingDown size={18} /> Areas for Improvement
							</h3>
							<ul>
								{results.improvements.map((s, i) => (
									<li key={i}>{s}</li>
								))}
							</ul>
						</div>
					)}

					<button className="btn btn-primary" onClick={() => navigate("/candidate/jobs")}>
						Back to Jobs
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="interview-room">
			<div className="interview-layout">
				{/* Left: Video Panel */}
				<div className="video-panel">
					<div className="video-container candidate-video">
						<video
							ref={videoRef}
							autoPlay
							playsInline
							muted
							className={videoEnabled ? "" : "video-off"}
						/>
						{!videoEnabled && (
							<div className="video-placeholder">
								<VideoOff size={48} />
								<p>Camera Off</p>
							</div>
						)}
						<div className="video-label">You</div>
						{webrtcConnected && (
							<div className="webrtc-badge" title="WebRTC connected">
								<Radio size={10} /> WebRTC
							</div>
						)}
					</div>

					<div className="video-container ai-interviewer">
						<div className="ai-avatar">
							<Bot size={64} />
							<div className="ai-pulse" />
						</div>
						<div className="video-label">AI Interviewer</div>
						{statusMessage && (
							<div className="ai-status">
								<Loader size={14} className="spin" />
								{statusMessage}
							</div>
						)}
					</div>

					<div className="video-controls">
						<button
							className={`control-btn ${!videoEnabled ? "off" : ""}`}
							onClick={toggleVideo}
							title="Toggle Camera"
						>
							{videoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
						</button>
						<button
							className={`control-btn ${!audioEnabled ? "off" : ""}`}
							onClick={toggleAudio}
							title="Toggle Microphone"
						>
							{audioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
						</button>
						<button
							className="control-btn end-call"
							onClick={() => setShowEndConfirm(true)}
							title="End Interview"
						>
							<PhoneOff size={20} />
						</button>
						<button
							className="control-btn leave-btn"
							onClick={leaveInterview}
							title="Leave Room"
						>
							<LogOut size={20} />
						</button>
					</div>
				</div>

				{/* Right: Interview Panel */}
				<div className="interview-panel">
					<div className="interview-header">
						<div className="header-info">
							<h2>{jobTitle || "AI Interview"}</h2>
							<div className="header-meta">
								<span className="timer">
									<Clock size={14} />
									{formatTime(elapsedTime)}
								</span>
								{totalQuestions > 0 && (
									<span className="progress-text">
										Question {currentIndex + 1} of {totalQuestions}
									</span>
								)}
							</div>
						</div>
						{totalQuestions > 0 && (
							<div className="progress-bar">
								<div
									className="progress-fill"
									style={{
										width: `${((currentIndex + 1) / totalQuestions) * 100}%`,
									}}
								/>
							</div>
						)}
					</div>

					{status === "connecting" && (
						<div className="interview-loading">
							<Loader size={32} className="spin" />
							<p>Setting up your interview...</p>
						</div>
					)}

					{previousFeedback && (
						<div className="feedback-toast">
							<Star size={16} />
							Score: {previousFeedback.score}/10 — {previousFeedback.feedback}
						</div>
					)}

					{currentQuestion && (
						<div className="question-section">
							<div className="question-badge">
								{currentQuestion.type === "follow_up" ? "Follow-up" : currentQuestion.category?.replace("_", " ")}
							</div>
							<div className="question-card">
								<MessageSquare size={20} />
								<p>{currentQuestion.text}</p>
							</div>
						</div>
					)}

					{status === "in_progress" && currentQuestion && (
						<div className="answer-section">
							<div className="transcript-area">
								<div className="transcript-header">
									<span>Your Answer</span>
									{isRecording && (
										<span className="listening-indicator">
											<span className="pulse-dot" />
											{isTranscribing ? "Transcribing..." : "Recording..."}
										</span>
									)}
								</div>
								<div className="transcript-content">
									{transcript ? (
										<span>{transcript}</span>
									) : (
										<span className="placeholder-text">
											Click the microphone to start speaking — your audio is streamed to the server and transcribed by Whisper AI. Or type below.
										</span>
									)}
								</div>
							</div>

							<div className="answer-controls">
								<button
									className={`btn ${isRecording ? "btn-danger" : "btn-primary"} mic-btn`}
									onClick={isRecording ? stopListening : startListening}
								>
									{isRecording ? (
										<>
											<MicOff size={16} /> Stop
										</>
									) : (
										<>
											<Mic size={16} /> Speak
										</>
									)}
								</button>
								<button
									className="btn btn-primary submit-btn"
									onClick={submitAnswer}
									disabled={!transcript.trim() || !!statusMessage}
								>
									{statusMessage ? (
										<>
											<Loader size={16} className="spin" /> Processing...
										</>
									) : (
										<>
											<Send size={16} /> Submit Answer
										</>
									)}
								</button>
							</div>

							<div className="manual-input-section">
								<input
									type="text"
									className="input-field"
									placeholder="Or type your answer here..."
									value={manualInput}
									onChange={(e) => setManualInput(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter") submitManualAnswer();
									}}
								/>
								<button
									className="btn btn-outline btn-sm"
									onClick={submitManualAnswer}
									disabled={!manualInput.trim() || !!statusMessage}
								>
									<Send size={14} />
								</button>
							</div>
						</div>
					)}

					{answeredQuestions.length > 0 && (
						<div className="answered-summary">
							{answeredQuestions.map((q, i) => (
								<div key={i} className="answered-dot" title={`Q${i + 1}: ${q.score}/10`}>
									<span
										className={`dot ${q.score >= 7 ? "good" : q.score >= 4 ? "ok" : "poor"}`}
									/>
								</div>
							))}
						</div>
					)}
				</div>
			</div>

			{showEndConfirm && (
				<div className="modal-overlay" onClick={() => setShowEndConfirm(false)}>
					<div className="end-confirm-modal" onClick={(e) => e.stopPropagation()}>
						<button className="modal-close-btn" onClick={() => setShowEndConfirm(false)}>
							<X size={20} />
						</button>
						<AlertCircle size={40} className="end-confirm-icon" />
						<h3>End Interview?</h3>
						<p>
							{answeredQuestions.length > 0
								? `You've answered ${answeredQuestions.length} question${answeredQuestions.length > 1 ? "s" : ""}. Ending now will generate your score based on what you've completed.`
								: "Are you sure you want to end the interview? Your progress will be scored."}
						</p>
						<div className="end-confirm-actions">
							<button
								className="btn btn-outline"
								onClick={() => setShowEndConfirm(false)}
							>
								Continue Interview
							</button>
							<button className="btn btn-danger" onClick={endInterview}>
								<PhoneOff size={16} />
								End & Get Score
							</button>
						</div>
						<button className="leave-link" onClick={leaveInterview}>
							<LogOut size={14} />
							Leave without scoring
						</button>
					</div>
				</div>
			)}
		</div>
	);
};

export default InterviewRoom;
