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
	Send,
	X,
	LogOut,
	Radio,
} from "lucide-react";
import "./InterviewRoom.css";

const INTERVIEW_SERVICE_URL =
	import.meta.env.VITE_INTERVIEW_SERVICE_URL || "http://localhost:5000";

const AUDIO_CHUNK_INTERVAL = 4000;
const SILENCE_THRESHOLD = 12;
const SILENCE_DURATION_MS = 4000;
const GRACE_PERIOD_MS = 4000;

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
	const [transcript, setTranscript] = useState("");
	const [statusMessage, setStatusMessage] = useState("");
	const [videoEnabled, setVideoEnabled] = useState(true);
	const [audioEnabled, setAudioEnabled] = useState(true);
	const [results, setResults] = useState(null);
	const [errorMessage, setErrorMessage] = useState("");
	const [elapsedTime, setElapsedTime] = useState(0);
	const [showEndConfirm, setShowEndConfirm] = useState(false);
	const [webrtcConnected, setWebrtcConnected] = useState(false);
	const [silenceNotice, setSilenceNotice] = useState(false);
	const [isAnswering, setIsAnswering] = useState(false);
	const [questionsAnswered, setQuestionsAnswered] = useState(0);

	const videoRef = useRef(null);
	const streamRef = useRef(null);
	const socketRef = useRef(null);
	const timerRef = useRef(null);
	const peerConnectionRef = useRef(null);
	const audioRecorderRef = useRef(null);
	const audioIntervalRef = useRef(null);
	const isRecordingRef = useRef(false);
	const videoRecorderRef = useRef(null);
	const videoChunksRef = useRef([]);
	const interviewIdRef = useRef(null);
	const transcriptRef = useRef("");
	const audioContextRef = useRef(null);
	const analyserRef = useRef(null);
	const silenceFrameRef = useRef(null);
	const silentSinceRef = useRef(null);
	const graceTimerRef = useRef(null);
	const isProcessingRef = useRef(false);
	const webrtcOfferSentRef = useRef(false);

	// Keep transcriptRef in sync
	useEffect(() => {
		transcriptRef.current = transcript;
	}, [transcript]);

	// ─── Media: getUserMedia ───
	const initializeMedia = useCallback(async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				video: true,
				audio: true,
			});
			streamRef.current = stream;
			requestAnimationFrame(() => {
				if (videoRef.current) {
					videoRef.current.srcObject = stream;
				}
			});
			return stream;
		} catch (err) {
			console.warn("Camera/mic access denied:", err);
			setVideoEnabled(false);
			setAudioEnabled(false);
			return null;
		}
	}, []);

	// ─── WebRTC: peer connection (socket signaling handlers registered once in connectSocket) ───
	const setupWebRTC = useCallback(async (socket, stream) => {
		if (!stream || !socket?.connected || webrtcOfferSentRef.current) return;

		if (peerConnectionRef.current) {
			try {
				peerConnectionRef.current.close();
			} catch {
				/* ignore */
			}
			peerConnectionRef.current = null;
		}

		const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
		peerConnectionRef.current = pc;

		stream.getTracks().forEach((track) => {
			pc.addTrack(track, stream);
		});

		pc.onicecandidate = (event) => {
			if (event.candidate && socket.connected) {
				socket.emit("webrtc-ice-candidate", {
					candidate: event.candidate.candidate,
					sdpMid: event.candidate.sdpMid,
					sdpMLineIndex: event.candidate.sdpMLineIndex,
				});
			}
		};

		pc.onconnectionstatechange = () => {
			if (pc.connectionState === "connected") setWebrtcConnected(true);
			if (pc.connectionState === "failed" || pc.connectionState === "disconnected")
				setWebrtcConnected(false);
		};

		try {
			const offer = await pc.createOffer();
			await pc.setLocalDescription(offer);
			socket.emit("webrtc-offer", { sdp: offer.sdp, type: offer.type });
			webrtcOfferSentRef.current = true;
		} catch (err) {
			console.error("Failed to create WebRTC offer:", err);
		}
	}, []);

	// ─── Silence detection via AudioContext ───
	const startSilenceDetection = useCallback(() => {
		const stream = streamRef.current;
		if (!stream || stream.getAudioTracks().length === 0) return;

		try {
			const ctx = new (window.AudioContext || window.webkitAudioContext)();
			const source = ctx.createMediaStreamSource(stream);
			const analyser = ctx.createAnalyser();
			analyser.fftSize = 2048;
			analyser.smoothingTimeConstant = 0.8;
			source.connect(analyser);
			audioContextRef.current = ctx;
			analyserRef.current = analyser;
		} catch (err) {
			console.warn("AudioContext not available:", err);
		}
	}, []);

	const monitorSilence = useCallback(() => {
		const analyser = analyserRef.current;
		if (!analyser) return;

		const dataArray = new Uint8Array(analyser.frequencyBinCount);

		const check = () => {
			if (isProcessingRef.current) {
				silentSinceRef.current = null;
				silenceFrameRef.current = requestAnimationFrame(check);
				return;
			}

			analyser.getByteFrequencyData(dataArray);
			const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

			if (avg < SILENCE_THRESHOLD) {
				if (!silentSinceRef.current) silentSinceRef.current = Date.now();
				const silentFor = Date.now() - silentSinceRef.current;

				if (
					silentFor >= SILENCE_DURATION_MS &&
					transcriptRef.current.trim() &&
					!graceTimerRef.current
				) {
					setSilenceNotice(true);
					graceTimerRef.current = setTimeout(() => {
						autoSubmitAnswer();
					}, GRACE_PERIOD_MS);
				}
			} else {
				silentSinceRef.current = null;
				if (graceTimerRef.current) {
					clearTimeout(graceTimerRef.current);
					graceTimerRef.current = null;
					setSilenceNotice(false);
				}
			}

			silenceFrameRef.current = requestAnimationFrame(check);
		};

		check();
	}, []);

	const stopSilenceMonitor = useCallback(() => {
		if (silenceFrameRef.current) {
			cancelAnimationFrame(silenceFrameRef.current);
			silenceFrameRef.current = null;
		}
		if (graceTimerRef.current) {
			clearTimeout(graceTimerRef.current);
			graceTimerRef.current = null;
		}
		silentSinceRef.current = null;
		setSilenceNotice(false);
	}, []);

	// ─── Audio recording: stop/restart for complete webm files ───
	const startAudioSegment = useCallback((socket, stream) => {
		if (!stream || !socket?.connected) return;

		const audioStream = new MediaStream(stream.getAudioTracks());
		const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
			? "audio/webm;codecs=opus"
			: "audio/webm";

		const chunks = [];
		const recorder = new MediaRecorder(audioStream, { mimeType });

		recorder.ondataavailable = (event) => {
			if (event.data.size > 0) chunks.push(event.data);
		};

		recorder.onstop = () => {
			if (chunks.length > 0 && socket.connected) {
				const blob = new Blob(chunks, { type: mimeType });
				if (blob.size > 1000) {
					blob.arrayBuffer().then((buffer) => {
						socket.emit("audio-chunk", buffer);
					});
				}
			}
			if (isRecordingRef.current) {
				startAudioSegment(socket, stream);
			}
		};

		recorder.start();
		audioRecorderRef.current = recorder;

		audioIntervalRef.current = setTimeout(() => {
			if (recorder.state !== "inactive") {
				recorder.stop();
			}
		}, AUDIO_CHUNK_INTERVAL);
	}, []);

	const startRecording = useCallback(() => {
		const socket = socketRef.current;
		const stream = streamRef.current;
		if (!socket || !stream) return;

		isRecordingRef.current = true;
		setIsAnswering(true);
		startAudioSegment(socket, stream);
		monitorSilence();
	}, [startAudioSegment, monitorSilence]);

	const stopRecording = useCallback(() => {
		isRecordingRef.current = false;
		setIsAnswering(false);
		stopSilenceMonitor();
		if (audioIntervalRef.current) {
			clearTimeout(audioIntervalRef.current);
			audioIntervalRef.current = null;
		}
		if (audioRecorderRef.current && audioRecorderRef.current.state !== "inactive") {
			audioRecorderRef.current.stop();
		}
	}, [stopSilenceMonitor]);

	/** Stop mic/camera tracks, peer connection, and recorders (e.g. when interview ends). */
	const releaseMediaAndPeer = useCallback(() => {
		stopRecording();
		if (timerRef.current) {
			clearInterval(timerRef.current);
			timerRef.current = null;
		}
		if (videoRecorderRef.current && videoRecorderRef.current.state !== "inactive") {
			videoRecorderRef.current.stop();
		}
		if (peerConnectionRef.current) {
			try {
				peerConnectionRef.current.close();
			} catch {
				/* ignore */
			}
			peerConnectionRef.current = null;
		}
		if (streamRef.current) {
			streamRef.current.getTracks().forEach((t) => t.stop());
			streamRef.current = null;
		}
		if (videoRef.current) {
			videoRef.current.srcObject = null;
		}
		if (audioContextRef.current) {
			audioContextRef.current.close().catch(() => {});
			audioContextRef.current = null;
		}
		analyserRef.current = null;
		webrtcOfferSentRef.current = false;
		setWebrtcConnected(false);
	}, [stopRecording]);

	// ─── Auto-submit on silence ───
	const autoSubmitAnswer = useCallback(() => {
		const answer = transcriptRef.current.trim();
		const socket = socketRef.current;
		if (!answer || !socket) return;

		stopRecording();
		isProcessingRef.current = true;
		setSilenceNotice(false);
		setStatusMessage("Processing your answer...");
		socket.emit("candidate-answer", { answer });
	}, [stopRecording]);

	// ─── Video recording for recruiter replay ───
	const startVideoRecording = useCallback((stream) => {
		if (!stream) return;
		const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
			? "video/webm;codecs=vp9,opus"
			: "video/webm";
		const recorder = new MediaRecorder(stream, { mimeType });
		videoChunksRef.current = [];
		recorder.ondataavailable = (event) => {
			if (event.data.size > 0) videoChunksRef.current.push(event.data);
		};
		recorder.start();
		videoRecorderRef.current = recorder;
	}, []);

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
		} catch (err) {
			console.error("Failed to upload recording:", err);
		}
	}, [authToken]);

	// ─── Handle new question arriving (auto-start recording) ───
	const onQuestionReceived = useCallback(
		(question, questionIndex, total) => {
			isProcessingRef.current = false;
			setCurrentQuestion(question);
			setCurrentIndex(questionIndex);
			setTotalQuestions(total);
			setTranscript("");
			transcriptRef.current = "";
			setStatusMessage("");
			setSilenceNotice(false);

			setTimeout(() => {
				startRecording();
			}, 1500);
		},
		[startRecording]
	);

	// ─── Socket.IO connection ───
	const connectSocket = useCallback(async () => {
		const { io } = await import("socket.io-client");

		const socket = io(INTERVIEW_SERVICE_URL, {
			auth: { token: authToken },
			transports: ["websocket", "polling"],
		});

		let capsReceived = false;
		let webrtcCapable = false;

		const tryStartWebRTC = async () => {
			if (!capsReceived || !webrtcCapable || webrtcOfferSentRef.current) return;
			const stream = streamRef.current;
			if (!stream || !socket.connected) return;
			await setupWebRTC(socket, stream);
		};

		const emitJoin = () => {
			if (socket.connected) {
				socket.emit("join-interview", { interviewToken });
			}
		};

		// Signaling handlers registered once — they always target peerConnectionRef.current
		socket.on("webrtc-answer", async ({ sdp, type }) => {
			const pc = peerConnectionRef.current;
			if (!pc) return;
			try {
				await pc.setRemoteDescription(new RTCSessionDescription({ sdp, type }));
			} catch (err) {
				console.error("Failed to set remote description:", err);
			}
		});

		socket.on("webrtc-ice-candidate", async ({ candidate, sdpMid, sdpMLineIndex }) => {
			const pc = peerConnectionRef.current;
			if (!pc || !candidate) return;
			try {
				await pc.addIceCandidate(
					new RTCIceCandidate({ candidate, sdpMid, sdpMLineIndex })
				);
			} catch (err) {
				console.error("Failed to add ICE candidate:", err);
			}
		});

		socket.on("webrtc-audio-connected", () => setWebrtcConnected(true));

		socket.on("connect", () => {
			emitJoin();
			tryStartWebRTC();
		});

		socket.on("connect_error", (err) => {
			console.error("Socket connection error:", err.message);
			setStatus("error");
			setErrorMessage("Failed to connect to interview service");
		});

		socket.on("capabilities", async (caps) => {
			webrtcCapable = !!caps?.webrtc;
			capsReceived = true;
			await tryStartWebRTC();
		});

		socket.on("transcription", ({ text }) => {
			if (text) {
				setTranscript((prev) => (prev ? prev + " " + text : text));
			}
		});

		socket.on("interview-started", (data) => {
			setStatus("in_progress");
			setJobTitle(data.jobTitle || "");
			interviewIdRef.current = data.interviewId;

			const stream = streamRef.current;
			if (stream) startVideoRecording(stream);

			timerRef.current = setInterval(() => {
				setElapsedTime((prev) => prev + 1);
			}, 1000);

			if (data.question) {
				onQuestionReceived(data.question, data.currentQuestionIndex, data.totalQuestions);
			}
		});

		socket.on("interview-already-completed", () => {
			setStatus("completed");
			setResults({ completed: true });
			releaseMediaAndPeer();
			socket.disconnect();
			socketRef.current = null;
		});

		socket.on("new-question", (data) => {
			setQuestionsAnswered((prev) => prev + 1);
			onQuestionReceived(data.question, data.currentQuestionIndex, data.totalQuestions);
		});

		socket.on("follow-up-question", (data) => {
			onQuestionReceived(data.question, data.currentQuestionIndex, data.totalQuestions);
		});

		socket.on("status-update", (data) => {
			setStatusMessage(data.message);
		});

		socket.on("interview-complete", async () => {
			setStatus("completed");
			setResults({ completed: true });
			isProcessingRef.current = false;
			stopRecording();

			if (videoRecorderRef.current && videoRecorderRef.current.state !== "inactive") {
				videoRecorderRef.current.stop();
			}
			await uploadRecording();
			releaseMediaAndPeer();
			socket.disconnect();
			socketRef.current = null;
		});

		socket.on("error", (data) => {
			setErrorMessage(data.message);
			if (data.message === "Interview not found" || data.message === "Unauthorized") {
				setStatus("error");
			}
		});

		socketRef.current = socket;

		if (socket.connected) {
			emitJoin();
			tryStartWebRTC();
		}
	}, [
		authToken,
		interviewToken,
		setupWebRTC,
		startVideoRecording,
		uploadRecording,
		onQuestionReceived,
		stopRecording,
		releaseMediaAndPeer,
	]);

	useEffect(() => {
		let alive = true;

		const init = async () => {
			await initializeMedia();
			if (!alive) return;
			startSilenceDetection();
			await connectSocket();
		};
		init();

		return () => {
			alive = false;
			isRecordingRef.current = false;
			if (socketRef.current) {
				socketRef.current.disconnect();
				socketRef.current = null;
			}
			if (audioIntervalRef.current) clearTimeout(audioIntervalRef.current);
			if (audioRecorderRef.current && audioRecorderRef.current.state !== "inactive")
				audioRecorderRef.current.stop();
			if (videoRecorderRef.current && videoRecorderRef.current.state !== "inactive")
				videoRecorderRef.current.stop();
			if (timerRef.current) clearInterval(timerRef.current);
			if (silenceFrameRef.current) cancelAnimationFrame(silenceFrameRef.current);
			if (graceTimerRef.current) clearTimeout(graceTimerRef.current);
			if (peerConnectionRef.current) {
				try {
					peerConnectionRef.current.close();
				} catch {
					/* ignore */
				}
				peerConnectionRef.current = null;
			}
			if (streamRef.current) {
				streamRef.current.getTracks().forEach((t) => t.stop());
				streamRef.current = null;
			}
			const videoEl = videoRef.current;
			if (videoEl) {
				videoEl.srcObject = null;
			}
			if (audioContextRef.current) {
				audioContextRef.current.close().catch(() => {});
				audioContextRef.current = null;
			}
			webrtcOfferSentRef.current = false;
		};
	}, [initializeMedia, startSilenceDetection, connectSocket]);

	const endInterview = () => {
		if (socketRef.current) {
			stopRecording();
			socketRef.current.emit("end-interview");
			setStatusMessage("Wrapping up your interview...");
		}
		setShowEndConfirm(false);
	};

	const leaveInterview = () => {
		releaseMediaAndPeer();
		if (socketRef.current) {
			socketRef.current.disconnect();
			socketRef.current = null;
		}
		if (audioIntervalRef.current) clearTimeout(audioIntervalRef.current);
		if (silenceFrameRef.current) cancelAnimationFrame(silenceFrameRef.current);
		if (graceTimerRef.current) clearTimeout(graceTimerRef.current);
		navigate("/candidate/jobs");
	};

	const toggleVideo = () => {
		if (streamRef.current) {
			const vt = streamRef.current.getVideoTracks()[0];
			if (vt) {
				vt.enabled = !vt.enabled;
				setVideoEnabled(vt.enabled);
			}
		}
	};

	const toggleAudio = () => {
		if (streamRef.current) {
			const at = streamRef.current.getAudioTracks()[0];
			if (at) {
				at.enabled = !at.enabled;
				setAudioEnabled(at.enabled);
			}
		}
	};

	const formatTime = (seconds) => {
		const m = Math.floor(seconds / 60);
		const s = seconds % 60;
		return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
	};

	// ─── Error screen ───
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

	// ─── Completed screen (no scores — recruiter releases them) ───
	if (status === "completed" && results) {
		return (
			<div className="interview-room">
				<div className="interview-results">
					<div className="results-header">
						<CheckCircle size={48} className="results-icon" />
						<h2>Interview Complete</h2>
						{jobTitle && <p className="results-job-title">{jobTitle}</p>}
					</div>
					<p className="results-feedback">
						Thank you for completing your AI interview! Your responses have been
						recorded and will be reviewed by the hiring team. You&apos;ll be notified
						once the results are available.
					</p>
					{questionsAnswered > 0 && (
						<p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
							You answered {questionsAnswered} question{questionsAnswered > 1 ? "s" : ""} in{" "}
							{formatTime(elapsedTime)}.
						</p>
					)}
					<button className="btn btn-primary" onClick={() => navigate("/candidate/jobs")}>
						Back to Jobs
					</button>
				</div>
			</div>
		);
	}

	// ─── Main interview UI ───
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
							<p className="permission-hint">
								When your browser asks, allow camera and microphone so we can run the
								session and WebRTC.
							</p>
						</div>
					)}

					{currentQuestion && (
						<div className="question-section">
							<div className="question-badge">
								{currentQuestion.type === "follow_up"
									? "Follow-up"
									: currentQuestion.category?.replace("_", " ")}
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
									{isAnswering && (
										<span className="listening-indicator">
											<span className="pulse-dot" />
											Listening...
										</span>
									)}
								</div>
								<div className="transcript-content">
									{transcript ? (
										<span>{transcript}</span>
									) : isAnswering ? (
										<span className="placeholder-text">
											Go ahead — start answering. Your speech is being transcribed in real time.
										</span>
									) : (
										<span className="placeholder-text">
											Preparing...
										</span>
									)}
								</div>
							</div>

							{silenceNotice && (
								<div className="silence-notice">
									<Send size={14} />
									Submitting your answer shortly&hellip; keep speaking to continue.
								</div>
							)}

							{statusMessage && !silenceNotice && (
								<div className="processing-notice">
									<Loader size={14} className="spin" />
									{statusMessage}
								</div>
							)}
						</div>
					)}
				</div>
			</div>

			{showEndConfirm && (
				<div className="modal-overlay" onClick={() => setShowEndConfirm(false)}>
					<div className="end-confirm-modal" onClick={(e) => e.stopPropagation()}>
						<button
							className="modal-close-btn"
							onClick={() => setShowEndConfirm(false)}
						>
							<X size={20} />
						</button>
						<AlertCircle size={40} className="end-confirm-icon" />
						<h3>End Interview?</h3>
						<p>
							Are you sure you want to end the interview? Your responses so far
							will be submitted for evaluation.
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
								End Interview
							</button>
						</div>
						<button className="leave-link" onClick={leaveInterview}>
							<LogOut size={14} />
							Leave without submitting
						</button>
					</div>
				</div>
			)}
		</div>
	);
};

export default InterviewRoom;
