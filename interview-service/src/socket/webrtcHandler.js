let werift;
try {
	werift = require("werift");
} catch {
	console.warn("werift not available — WebRTC server-side peer disabled, using fallback audio transport");
}

const activePeers = new Map();

/**
 * Set up WebRTC signaling and server-side peer connection for a socket.
 * The server acts as a receiving peer: it accepts the client's audio/video
 * tracks over a genuine WebRTC connection (SDP offer/answer, ICE, DTLS/SRTP).
 */
const registerWebRTCHandlers = (socket) => {
	if (!werift) {
		socket.webrtcAvailable = false;
		return;
	}

	socket.webrtcAvailable = true;

	socket.on("webrtc-offer", async ({ sdp }) => {
		try {
			const pc = new werift.RTCPeerConnection({
				iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
			});

			pc.addTransceiver("audio", { direction: "recvonly" });
			pc.addTransceiver("video", { direction: "recvonly" });

			pc.ontrack = (event) => {
				const track = event.track;
				if (track.kind === "audio" && track.onReceiveRtp) {
					socket.webrtcAudioConnected = true;
					socket.emit("webrtc-audio-connected");
					console.log(`WebRTC audio track connected for ${socket.user.id}`);
				}
				if (track.kind === "video") {
					console.log(`WebRTC video track connected for ${socket.user.id}`);
				}
			};

			pc.onicecandidate = ({ candidate }) => {
				if (candidate) {
					socket.emit("webrtc-ice-candidate", {
						candidate: candidate.candidate,
						sdpMid: candidate.sdpMid,
						sdpMLineIndex: candidate.sdpMLineIndex,
					});
				}
			};

			pc.onnegotiationneeded = () => {
				console.log("WebRTC negotiation needed");
			};

			await pc.setRemoteDescription(
				new werift.RTCSessionDescription(sdp, "offer")
			);

			const answer = await pc.createAnswer();
			await pc.setLocalDescription(answer);

			activePeers.set(socket.id, pc);

			socket.emit("webrtc-answer", {
				sdp: pc.localDescription.sdp,
				type: "answer",
			});

			console.log(`WebRTC peer connection established for ${socket.user.id}`);
		} catch (error) {
			console.error("WebRTC offer handling error:", error.message);
			socket.emit("webrtc-error", { message: "Failed to establish WebRTC connection" });
		}
	});

	socket.on("webrtc-ice-candidate", async ({ candidate, sdpMid, sdpMLineIndex }) => {
		try {
			const pc = activePeers.get(socket.id);
			if (pc && candidate) {
				await pc.addIceCandidate({ candidate, sdpMid, sdpMLineIndex });
			}
		} catch (error) {
			console.error("ICE candidate error:", error.message);
		}
	});

	socket.on("disconnect", () => {
		const pc = activePeers.get(socket.id);
		if (pc) {
			try {
				pc.close();
			} catch {
				// ignore close errors
			}
			activePeers.delete(socket.id);
		}
	});
};

const getActivePeer = (socketId) => activePeers.get(socketId);

const isWebRTCAvailable = () => !!werift;

module.exports = {
	registerWebRTCHandlers,
	getActivePeer,
	isWebRTCAvailable,
};
