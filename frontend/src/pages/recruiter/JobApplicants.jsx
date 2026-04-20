import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
	ArrowLeft,
	BarChart3,
	CheckCircle,
	Clock,
	ExternalLink,
	FileText,
	Loader,
	Play,
	Send,
	Star,
	Trophy,
	Users,
	Video,
	X,
	XCircle,
	AlertTriangle,
	ChevronLeft,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { graphqlRequest } from "../../utils/graphql";
import AIAnalysisReport from "./AIAnalysisReport";
import "../candidate/CandidateHome.css";

const formatDate = (isoString) => {
	if (!isoString) return "";
	try {
		return new Date(isoString).toLocaleDateString(undefined, {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	} catch {
		return "";
	}
};

const getScoreColor = (score) => {
	if (score >= 75) return "#10b981";
	if (score >= 50) return "#f59e0b";
	return "#ef4444";
};

const statusStyle = (status) => {
	switch (status) {
		case "shortlisted":
			return { bg: "rgba(16, 185, 129, 0.15)", color: "#10b981" };
		case "rejected":
			return { bg: "rgba(239, 68, 68, 0.15)", color: "#ef4444" };
		case "hired":
			return { bg: "rgba(34, 211, 238, 0.15)", color: "var(--accent-cyan)" };
		case "reviewed":
			return { bg: "rgba(139, 92, 246, 0.15)", color: "#8b5cf6" };
		default:
			return { bg: "rgba(245, 158, 11, 0.15)", color: "#f59e0b" };
	}
};

const rankAccent = (rank) => {
	if (rank === 1) return { bg: "linear-gradient(135deg, #fbbf24, #f59e0b)", color: "#0b0f1a" };
	if (rank === 2) return { bg: "linear-gradient(135deg, #e5e7eb, #9ca3af)", color: "#0b0f1a" };
	if (rank === 3) return { bg: "linear-gradient(135deg, #fb923c, #c2410c)", color: "#0b0f1a" };
	return { bg: "var(--bg-card)", color: "var(--text-secondary)" };
};

const JobApplicants = () => {
	const { jobId } = useParams();
	const navigate = useNavigate();
	const { user, loading: authLoading, token } = useAuth();

	const [job, setJob] = useState(null);
	const [applicants, setApplicants] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [statusUpdating, setStatusUpdating] = useState(null);
	const [interviewStatuses, setInterviewStatuses] = useState({});
	const [sendingInterview, setSendingInterview] = useState(null);
	const [releasingResults, setReleasingResults] = useState(null);
	const [evaluationScoresMap, setEvaluationScoresMap] = useState({});

	const [showAnalysisModal, setShowAnalysisModal] = useState(false);
	const [analysisData, setAnalysisData] = useState(null);
	const [analysisLoading, setAnalysisLoading] = useState(false);
	const [analysisCandidate, setAnalysisCandidate] = useState(null);
	const [analysisAppId, setAnalysisAppId] = useState(null);
	const [triggerLoading, setTriggerLoading] = useState(false);
	const [triggerSent, setTriggerSent] = useState(false);
	const [triggerError, setTriggerError] = useState(null);

	useEffect(() => {
		if (!authLoading && (!user || user.role !== "recruiter")) {
			navigate("/login");
		}
	}, [user, authLoading, navigate]);

	useEffect(() => {
		const load = async () => {
			if (!token || !jobId) return;
			setLoading(true);
			setError(null);
			try {
				const data = await graphqlRequest(
					`
					query JobAndApplicants($job_id: ID!) {
						job(id: $job_id) {
							id
							title
							description
							employment_type
							experience_level
							location_type
							location
							deadline
							skills
							createdAt
							application_count
						}
						applicationsForJob(job_id: $job_id, limit: 100) {
							id
							status
							cover_letter
							resume_url
							createdAt
							candidate {
								id
								first_name
								last_name
								email
								phone_number
								skills
								linkedin_url
								github_url
								portfolio_url
								profile_summary
								location_city
								location_state
							}
						}
					}
					`,
					{ job_id: jobId },
					token
				);

				setJob(data.job);
				const apps = data.applicationsForJob || [];
				setApplicants(apps);

				const ivStatuses = {};
				await Promise.all(
					apps.map(async (app) => {
						try {
							const ivData = await graphqlRequest(
								`query GetInterview($application_id: ID!) {
									interviewForApplication(application_id: $application_id) {
										id status overall_score interview_token recording_url results_released
									}
								}`,
								{ application_id: app.id },
								token
							);
							if (ivData.interviewForApplication) {
								ivStatuses[app.id] = ivData.interviewForApplication;
							}
						} catch {
							/* no interview */
						}
					})
				);
				setInterviewStatuses(ivStatuses);

				const candidateIds = apps.map((a) => a.candidate?.id).filter(Boolean);
				if (candidateIds.length > 0) {
					try {
						const scoresData = await graphqlRequest(
							`
							query GetEvalScores($job_id: String!, $candidate_ids: [String!]!) {
								evaluationScores(job_id: $job_id, candidate_ids: $candidate_ids) {
									candidate_id
									final_score
									fit_level
								}
							}
							`,
							{ job_id: jobId, candidate_ids: candidateIds },
							token
						);
						const scoresMap = {};
						(scoresData.evaluationScores || []).forEach((s) => {
							scoresMap[s.candidate_id] = s;
						});
						setEvaluationScoresMap(scoresMap);
					} catch (scoreErr) {
						console.error("Error fetching evaluation scores:", scoreErr);
					}
				}
			} catch (err) {
				console.error("Error loading applicants page:", err);
				setError(err.message || "Failed to load applicants");
			} finally {
				setLoading(false);
			}
		};

		if (!authLoading) load();
	}, [token, jobId, authLoading]);

	const deadlineDate = job?.deadline ? new Date(job.deadline) : null;
	const deadlinePassed = deadlineDate ? deadlineDate.getTime() < Date.now() : false;

	const filteredApplicants = useMemo(() => {
		if (!deadlineDate) return applicants;
		return applicants.filter(
			(app) => new Date(app.createdAt) <= deadlineDate
		);
	}, [applicants, deadlineDate]);

	const sortedApplicants = useMemo(() => {
		return [...filteredApplicants].sort((a, b) => {
			const aScore = evaluationScoresMap[a.candidate?.id]?.final_score ?? 0;
			const bScore = evaluationScoresMap[b.candidate?.id]?.final_score ?? 0;
			if (bScore !== aScore) return bScore - aScore;
			return new Date(b.createdAt) - new Date(a.createdAt);
		});
	}, [filteredApplicants, evaluationScoresMap]);

	const excludedCount = applicants.length - filteredApplicants.length;
	const shortlistedCount = sortedApplicants.filter((a) => a.status === "shortlisted").length;
	const rejectedCount = sortedApplicants.filter((a) => a.status === "rejected").length;
	const evaluatedCount = sortedApplicants.filter((a) => evaluationScoresMap[a.candidate?.id]).length;

	const handleUpdateStatus = async (applicationId, newStatus) => {
		setStatusUpdating(applicationId);
		try {
			await graphqlRequest(
				`
				mutation UpdateAppStatus($id: ID!, $status: ApplicationStatus!) {
					updateApplicationStatus(id: $id, status: $status) {
						id
						status
					}
				}
				`,
				{ id: applicationId, status: newStatus },
				token
			);
			setApplicants((prev) =>
				prev.map((a) => (a.id === applicationId ? { ...a, status: newStatus } : a))
			);
		} catch (err) {
			console.error("Error updating status:", err);
		} finally {
			setStatusUpdating(null);
		}
	};

	const handleSendAiInterview = async (applicationId) => {
		setSendingInterview(applicationId);
		try {
			const data = await graphqlRequest(
				`mutation SendAiInterview($input: SendAiInterviewInput!) {
					sendAiInterview(input: $input) {
						id status overall_score interview_token recording_url results_released
					}
				}`,
				{ input: { application_id: applicationId } },
				token
			);
			setInterviewStatuses((prev) => ({
				...prev,
				[applicationId]: data.sendAiInterview,
			}));
		} catch (err) {
			console.error("Error sending AI interview:", err);
		} finally {
			setSendingInterview(null);
		}
	};

	const handleReleaseResults = async (applicationId, interviewId) => {
		setReleasingResults(applicationId);
		try {
			const data = await graphqlRequest(
				`mutation ReleaseResults($interview_id: ID!) {
					releaseInterviewResults(interview_id: $interview_id) {
						id status overall_score interview_token recording_url results_released
					}
				}`,
				{ interview_id: interviewId },
				token
			);
			setInterviewStatuses((prev) => ({
				...prev,
				[applicationId]: data.releaseInterviewResults,
			}));
		} catch (err) {
			console.error("Error releasing results:", err);
		} finally {
			setReleasingResults(null);
		}
	};

	const handleShowAnalysis = async (app) => {
		setAnalysisCandidate(app.candidate);
		setAnalysisAppId(app.id);
		setAnalysisData(null);
		setAnalysisLoading(true);
		setShowAnalysisModal(true);
		setTriggerSent(false);
		setTriggerError(null);

		try {
			const data = await graphqlRequest(
				`
				query GetEvaluation($candidate_id: String!, $job_id: String!) {
					evaluation(candidate_id: $candidate_id, job_id: $job_id) {
						id
						final_score
						fit_level
						summary
						top_strengths
						key_concerns
						interview_focus_areas
						dimension_scores { dimension score rationale }
						strength_tags
						concern_tags { label severity }
						agent_results {
							agent_name
							overall_score
							category_scores { category score weight evidence }
							strengths
							weaknesses
						}
						weight_profile { name reason }
						created_at
					}
				}
				`,
				{ candidate_id: app.candidate.id, job_id: jobId },
				token
			);
			setAnalysisData(data.evaluation);
		} catch (err) {
			console.error("Error fetching evaluation:", err);
			setAnalysisData(null);
		} finally {
			setAnalysisLoading(false);
		}
	};

	const handleCloseAnalysisModal = () => {
		setShowAnalysisModal(false);
		setAnalysisData(null);
		setAnalysisCandidate(null);
		setAnalysisAppId(null);
	};

	const handleAnalysisAction = async (action) => {
		if (!analysisAppId) return;
		const newStatus = action === "accept" ? "shortlisted" : "rejected";
		await handleUpdateStatus(analysisAppId, newStatus);
		handleCloseAnalysisModal();
	};

	const handleTriggerEvaluation = async () => {
		if (!analysisCandidate || !job) return;
		setTriggerLoading(true);
		setTriggerError(null);
		try {
			await graphqlRequest(
				`
				mutation TriggerEval($candidate_id: String!, $job_id: String!) {
					triggerEvaluation(candidate_id: $candidate_id, job_id: $job_id)
				}
				`,
				{ candidate_id: analysisCandidate.id, job_id: jobId },
				token
			);
			setTriggerSent(true);
		} catch (err) {
			console.error("Error triggering evaluation:", err);
			setTriggerError(err.message || "Failed to trigger evaluation");
		} finally {
			setTriggerLoading(false);
		}
	};

	if (loading || authLoading) {
		return (
			<div className="dashboard-page">
				<div className="container">
					<div className="loading-spinner">
						<div className="spinner"></div>
						<p>Loading applicants...</p>
					</div>
				</div>
			</div>
		);
	}

	if (error || !job) {
		return (
			<div className="dashboard-page">
				<div className="container" style={{ padding: "3rem 1.5rem", textAlign: "center" }}>
					<AlertTriangle size={48} style={{ color: "#f59e0b", marginBottom: "1rem" }} />
					<h2>Couldn't load this job</h2>
					<p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
						{error || "Job not found."}
					</p>
					<button className="btn btn-primary" onClick={() => navigate("/recruiter/home")}>
						<ArrowLeft size={16} />
						Back to dashboard
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="dashboard-page">
			<div className="container" style={{ paddingTop: "1.5rem" }}>
				<button
					className="btn btn-outline btn-sm"
					onClick={() => navigate("/recruiter/home")}
					style={{ marginBottom: "1.25rem" }}
				>
					<ArrowLeft size={14} />
					Back to dashboard
				</button>

				<div
					style={{
						background: "var(--bg-card)",
						border: "1px solid var(--border)",
						borderRadius: "0.9rem",
						padding: "1.5rem",
						marginBottom: "1.25rem",
					}}
				>
					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
						<div style={{ minWidth: 0, flex: 1 }}>
							<div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.4rem" }}>
								<h1 style={{ margin: 0, fontSize: "1.6rem" }}>{job.title}</h1>
								{deadlineDate && (
									<span
										style={{
											padding: "0.25rem 0.7rem",
											borderRadius: "1rem",
											fontSize: "0.75rem",
											fontWeight: 600,
											background: deadlinePassed ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)",
											color: deadlinePassed ? "#ef4444" : "#10b981",
											border: `1px solid ${deadlinePassed ? "rgba(239, 68, 68, 0.3)" : "rgba(16, 185, 129, 0.3)"}`,
											display: "inline-flex",
											alignItems: "center",
											gap: "0.3rem",
										}}
									>
										<Clock size={12} />
										{deadlinePassed ? `Closed ${formatDate(job.deadline)}` : `Open until ${formatDate(job.deadline)}`}
									</span>
								)}
							</div>
							<p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.9rem" }}>
								{job.employment_type?.replace("_", " ")} • {job.experience_level} • {job.location_type === "remote" ? "Remote" : job.location}
							</p>
						</div>
						<div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
							<StatPill icon={<Users size={14} />} label="Applicants" value={sortedApplicants.length} />
							<StatPill icon={<Trophy size={14} />} label="Shortlisted" value={shortlistedCount} color="#10b981" />
							<StatPill icon={<XCircle size={14} />} label="Rejected" value={rejectedCount} color="#ef4444" />
							<StatPill icon={<BarChart3 size={14} />} label="AI Evaluated" value={`${evaluatedCount}/${sortedApplicants.length}`} color="#8b5cf6" />
						</div>
					</div>

					{deadlineDate && (
						<div
							style={{
								marginTop: "1rem",
								display: "flex",
								alignItems: "center",
								gap: "0.6rem",
								padding: "0.75rem 1rem",
								borderRadius: "0.6rem",
								background: deadlinePassed ? "rgba(239, 68, 68, 0.08)" : "rgba(16, 185, 129, 0.08)",
								border: `1px solid ${deadlinePassed ? "rgba(239, 68, 68, 0.25)" : "rgba(16, 185, 129, 0.25)"}`,
								color: deadlinePassed ? "#ef4444" : "#10b981",
								fontSize: "0.85rem",
								fontWeight: 500,
							}}
						>
							<Clock size={16} />
							{deadlinePassed
								? `Application deadline passed on ${formatDate(job.deadline)}. Showing the final ranked list of candidates who applied in time.`
								: `Application deadline: ${formatDate(job.deadline)}.`}
							{excludedCount > 0 && ` ${excludedCount} late application${excludedCount === 1 ? "" : "s"} hidden.`}
						</div>
					)}
				</div>

				{sortedApplicants.length === 0 ? (
					<div
						style={{
							background: "var(--bg-card)",
							border: "1px solid var(--border)",
							borderRadius: "0.9rem",
							padding: "4rem 1.5rem",
							textAlign: "center",
							color: "var(--text-secondary)",
						}}
					>
						<Users size={48} style={{ opacity: 0.4, marginBottom: "1rem" }} />
						<h3 style={{ color: "var(--text-primary)", marginBottom: "0.5rem" }}>
							{applicants.length === 0 ? "No applicants yet" : "No applicants before the deadline"}
						</h3>
						<p>
							{applicants.length === 0
								? "Applicants will appear here once candidates apply to this job."
								: "All applications were submitted after the posted deadline."}
						</p>
					</div>
				) : (
					<div
						style={{
							background: "var(--bg-card)",
							border: "1px solid var(--border)",
							borderRadius: "0.9rem",
							overflow: "hidden",
						}}
					>
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "70px minmax(220px, 1.6fr) 110px 130px 130px minmax(420px, 2fr)",
								gap: "0.5rem",
								padding: "0.85rem 1.25rem",
								background: "var(--bg-dark)",
								borderBottom: "1px solid var(--border)",
								fontSize: "0.75rem",
								fontWeight: 700,
								letterSpacing: "0.05em",
								textTransform: "uppercase",
								color: "var(--text-secondary)",
							}}
						>
							<div>Rank</div>
							<div>Candidate</div>
							<div>AI Score</div>
							<div>Status</div>
							<div>Applied</div>
							<div>Actions</div>
						</div>

						{sortedApplicants.map((app, index) => {
							const rank = index + 1;
							const accent = rankAccent(rank);
							const sStyle = statusStyle(app.status);
							const score = evaluationScoresMap[app.candidate?.id]?.final_score;
							const fitLevel = evaluationScoresMap[app.candidate?.id]?.fit_level;
							const iv = interviewStatuses[app.id];

							return (
								<div
									key={app.id}
									style={{
										display: "grid",
										gridTemplateColumns: "70px minmax(220px, 1.6fr) 110px 130px 130px minmax(420px, 2fr)",
										gap: "0.5rem",
										padding: "1rem 1.25rem",
										borderBottom: "1px solid var(--border)",
										alignItems: "center",
									}}
								>
									<div>
										<div
											title={`Rank #${rank}`}
											style={{
												width: 44,
												height: 44,
												borderRadius: "50%",
												background: accent.bg,
												color: accent.color,
												fontWeight: 800,
												fontSize: "0.95rem",
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												border: rank <= 3 ? "none" : "1px solid var(--border)",
											}}
										>
											{rank <= 3 ? <Trophy size={18} /> : `#${rank}`}
										</div>
									</div>

									<div style={{ minWidth: 0 }}>
										<div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.95rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
											{app.candidate?.first_name} {app.candidate?.last_name}
										</div>
										<div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
											{app.candidate?.email}
											{app.candidate?.location_city && ` • ${app.candidate.location_city}${app.candidate.location_state ? `, ${app.candidate.location_state}` : ""}`}
										</div>
										{Array.isArray(app.candidate?.skills) && app.candidate.skills.length > 0 && (
											<div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", marginTop: "0.4rem" }}>
												{app.candidate.skills.slice(0, 4).map((skill) => (
													<span className="tag" key={`${app.id}-${skill}`} style={{ fontSize: "0.7rem", padding: "0.15rem 0.5rem" }}>
														{skill}
													</span>
												))}
												{app.candidate.skills.length > 4 && (
													<span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>
														+{app.candidate.skills.length - 4}
													</span>
												)}
											</div>
										)}
									</div>

									<div>
										{score !== undefined ? (
											<div
												style={{
													display: "inline-flex",
													alignItems: "center",
													gap: "0.35rem",
													padding: "0.3rem 0.65rem",
													borderRadius: "0.5rem",
													background: `${getScoreColor(score)}22`,
													color: getScoreColor(score),
													fontWeight: 700,
													fontSize: "0.85rem",
												}}
												title={fitLevel ? `${fitLevel} fit` : ""}
											>
												<BarChart3 size={13} />
												{Math.round(score)}
											</div>
										) : (
											<span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>—</span>
										)}
									</div>

									<div>
										<span
											style={{
												display: "inline-block",
												padding: "0.25rem 0.7rem",
												borderRadius: "1rem",
												fontSize: "0.72rem",
												fontWeight: 600,
												background: sStyle.bg,
												color: sStyle.color,
											}}
										>
											{app.status.charAt(0).toUpperCase() + app.status.slice(1)}
										</span>
									</div>

									<div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
										{formatDate(app.createdAt)}
									</div>

									<div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", justifyContent: "flex-end" }}>
										{app.resume_url && (
											<a
												href={app.resume_url}
												target="_blank"
												rel="noopener noreferrer"
												className="btn btn-outline btn-sm"
												style={{ textDecoration: "none" }}
												title="View resume"
											>
												<FileText size={14} />
											</a>
										)}
										{app.candidate?.linkedin_url && (
											<a
												href={app.candidate.linkedin_url}
												target="_blank"
												rel="noopener noreferrer"
												className="btn btn-outline btn-sm"
												style={{ textDecoration: "none" }}
												title="LinkedIn"
											>
												<ExternalLink size={14} />
											</a>
										)}
										<button
											className="btn btn-sm"
											style={{ background: "rgba(139, 92, 246, 0.15)", color: "#8b5cf6", border: "1px solid rgba(139, 92, 246, 0.3)" }}
											onClick={() => handleShowAnalysis(app)}
										>
											<BarChart3 size={14} />
											AI Analysis
										</button>

										{(() => {
											if (iv && iv.status === "completed") {
												return (
													<>
														<span
															className="btn btn-sm"
															style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.3)", cursor: "default" }}
														>
															<CheckCircle size={14} />
															{Math.round(iv.overall_score || 0)}/100
														</span>
														{iv.recording_url && (
															<a
																href={`${import.meta.env.VITE_INTERVIEW_SERVICE_URL || "http://localhost:5001"}${iv.recording_url}`}
																target="_blank"
																rel="noopener noreferrer"
																className="btn btn-sm"
																style={{ background: "rgba(99, 102, 241, 0.15)", color: "#6366f1", border: "1px solid rgba(99, 102, 241, 0.3)" }}
																title="Watch recording"
															>
																<Play size={14} />
															</a>
														)}
														{iv.results_released ? (
															<span
																className="btn btn-sm"
																style={{ background: "rgba(16, 185, 129, 0.1)", color: "#6ee7b7", border: "1px solid rgba(16, 185, 129, 0.2)", cursor: "default" }}
																title="Results released"
															>
																<CheckCircle size={14} />
															</span>
														) : (
															<button
																className="btn btn-sm"
																style={{ background: "rgba(234, 179, 8, 0.15)", color: "#eab308", border: "1px solid rgba(234, 179, 8, 0.3)" }}
																onClick={() => handleReleaseResults(app.id, iv.id)}
																disabled={releasingResults === app.id}
																title="Release interview results to candidate"
															>
																{releasingResults === app.id ? (
																	<Loader size={14} className="spin" />
																) : (
																	<Send size={14} />
																)}
															</button>
														)}
													</>
												);
											}
											if (iv && (iv.status === "scheduled" || iv.status === "in_progress")) {
												return (
													<span
														className="btn btn-sm"
														style={{ background: "rgba(139, 92, 246, 0.15)", color: "#8b5cf6", border: "1px solid rgba(139, 92, 246, 0.3)", cursor: "default" }}
													>
														<Video size={14} />
														Interview Sent
													</span>
												);
											}
											return (
												<button
													className="btn btn-sm"
													style={{ background: "rgba(139, 92, 246, 0.15)", color: "#8b5cf6", border: "1px solid rgba(139, 92, 246, 0.3)" }}
													onClick={() => handleSendAiInterview(app.id)}
													disabled={sendingInterview === app.id}
												>
													{sendingInterview === app.id ? (
														<Loader size={14} className="spin" />
													) : (
														<Video size={14} />
													)}
													Send AI Interview
												</button>
											);
										})()}

										{app.status !== "shortlisted" && (
											<button
												className="btn btn-sm"
												style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.3)" }}
												onClick={() => handleUpdateStatus(app.id, "shortlisted")}
												disabled={statusUpdating === app.id}
											>
												<Star size={14} />
												Shortlist
											</button>
										)}
										{app.status !== "rejected" && (
											<button
												className="btn btn-sm"
												style={{ background: "rgba(239, 68, 68, 0.15)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.3)" }}
												onClick={() => handleUpdateStatus(app.id, "rejected")}
												disabled={statusUpdating === app.id}
											>
												<XCircle size={14} />
												Reject
											</button>
										)}
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>

			{showAnalysisModal && (
				<div className="modal-overlay" onClick={handleCloseAnalysisModal}>
					<div
						className="modal-content modal-large"
						onClick={(e) => e.stopPropagation()}
						style={{ maxHeight: "90vh", maxWidth: "950px", overflow: "hidden", display: "flex", flexDirection: "column" }}
					>
						<div className="modal-header">
							<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
								<button
									onClick={handleCloseAnalysisModal}
									className="btn btn-outline btn-sm"
									style={{ padding: "0.3rem 0.5rem", marginRight: "0.25rem" }}
								>
									<ChevronLeft size={18} />
								</button>
								<BarChart3 size={22} style={{ color: "#8b5cf6" }} />
								<h2 style={{ margin: 0 }}>
									AI Analysis {analysisCandidate ? `— ${analysisCandidate.first_name} ${analysisCandidate.last_name}` : ""}
								</h2>
							</div>
							<button className="modal-close" onClick={handleCloseAnalysisModal}>
								<X size={24} />
							</button>
						</div>
						<div className="modal-body" style={{ overflowY: "auto", flex: 1 }}>
							{analysisLoading ? (
								<div className="loading-spinner" style={{ minHeight: "200px" }}>
									<div className="spinner"></div>
									<p>Loading AI analysis...</p>
								</div>
							) : !analysisData ? (
								<div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-secondary)" }}>
									<AlertTriangle size={48} style={{ opacity: 0.4, marginBottom: "1rem", color: "#f59e0b" }} />
									<h3 style={{ color: "var(--text-primary)" }}>No AI Analysis Available</h3>
									<p>This candidate has not been evaluated by the AI pipeline yet.</p>
									{triggerSent ? (
										<div style={{ marginTop: "1.25rem", padding: "0.75rem 1rem", borderRadius: "0.5rem", background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)", color: "#10b981", fontSize: "0.95rem" }}>
											<CheckCircle size={16} style={{ verticalAlign: "middle", marginRight: "0.4rem" }} />
											Evaluation triggered successfully. It may take a few minutes to complete.
										</div>
									) : (
										<div style={{ marginTop: "1.25rem" }}>
											<button
												className="btn btn-primary"
												style={{ padding: "0.6rem 1.5rem", fontSize: "0.95rem" }}
												onClick={handleTriggerEvaluation}
												disabled={triggerLoading}
											>
												<BarChart3 size={16} />
												{triggerLoading ? "Triggering..." : "Trigger AI Analysis"}
											</button>
											{triggerError && (
												<p style={{ marginTop: "0.75rem", color: "#ef4444", fontSize: "0.9rem" }}>
													{triggerError}
												</p>
											)}
										</div>
									)}
								</div>
							) : (
								<AIAnalysisReport
									data={analysisData}
									candidate={analysisCandidate}
									appId={analysisAppId}
									onAction={handleAnalysisAction}
									statusUpdating={statusUpdating}
								/>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

const StatPill = ({ icon, label, value, color = "var(--text-primary)" }) => (
	<div
		style={{
			display: "flex",
			alignItems: "center",
			gap: "0.5rem",
			padding: "0.55rem 0.9rem",
			borderRadius: "0.7rem",
			background: "var(--bg-dark)",
			border: "1px solid var(--border)",
			minWidth: "115px",
		}}
	>
		<span style={{ color, display: "flex", alignItems: "center" }}>{icon}</span>
		<div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
			<span style={{ fontSize: "0.95rem", fontWeight: 700, color }}>{value}</span>
			<span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>{label}</span>
		</div>
	</div>
);

export default JobApplicants;
