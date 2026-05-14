import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, Briefcase, Video } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { graphqlRequest } from "../../utils/graphql";
import { markAllCandidateApplicationsSeen } from "../../utils/candidateApplicationNotifications";
import "../candidate/CandidateHome.css";
import "../recruiter/RecruiterNotifications.css";

const formatWhen = (iso) => {
	if (!iso) return "";
	try {
		const d = new Date(iso);
		if (Number.isNaN(d.getTime())) return "";
		return d.toLocaleString(undefined, {
			month: "short",
			day: "numeric",
			year: "numeric",
			hour: "numeric",
			minute: "2-digit",
		});
	} catch {
		return "";
	}
};

const statusLabel = (s) => {
	switch (s) {
		case "shortlisted":
			return "Shortlisted";
		case "rejected":
			return "Rejected";
		case "hired":
			return "Hired";
		case "reviewed":
			return "Reviewed";
		default:
			return "Pending";
	}
};

const interviewLabel = (iv) => {
	if (!iv) return null;
	if (iv.status === "scheduled") return "AI interview sent — not started";
	if (iv.status === "in_progress") return "AI interview in progress";
	if (iv.status === "completed" && iv.results_released)
		return "Interview results available";
	if (iv.status === "completed") return "Interview completed — results pending";
	if (iv.status === "expired") return "Interview expired";
	return `Interview: ${iv.status}`;
};

const CandidateNotifications = () => {
	const navigate = useNavigate();
	const { user, loading: authLoading, token } = useAuth();
	const [applications, setApplications] = useState([]);
	const [interviews, setInterviews] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		if (!authLoading && (!user || user.role !== "candidate")) {
			navigate("/login");
		}
	}, [user, authLoading, navigate]);

	useEffect(() => {
		const load = async () => {
			if (!token || user?.role !== "candidate") return;
			setLoading(true);
			setError(null);
			try {
				const data = await graphqlRequest(
					`
					query CandidateNotifFeed {
						myApplications(limit: 200, offset: 0) {
							id
							job_id
							status
							createdAt
							updatedAt
							job {
								id
								title
								company_name
								location
							}
						}
						myInterviews {
							id
							application_id
							interview_token
							status
							job_title
							results_released
							overall_score
							completed_at
						}
					}
					`,
					{},
					token
				);
				const apps = data.myApplications || [];
				const ivs = data.myInterviews || [];
				const sorted = [...apps].sort((a, b) => {
					const ta = new Date(a.updatedAt || a.createdAt || 0).getTime();
					const tb = new Date(b.updatedAt || b.createdAt || 0).getTime();
					return tb - ta;
				});
				setApplications(sorted);
				setInterviews(ivs);
				if (user?.id) {
					markAllCandidateApplicationsSeen(user.id, apps, ivs);
				}
				window.dispatchEvent(new Event("candidate-notifications-seen"));
			} catch (e) {
				console.error(e);
				setError(e.message || "Could not load application updates");
			} finally {
				setLoading(false);
			}
		};
		load();
	}, [token, user?.id, user?.role]);

	const interviewByAppId = useMemo(() => {
		const m = {};
		for (const iv of interviews) {
			if (iv?.application_id) m[String(iv.application_id)] = iv;
		}
		return m;
	}, [interviews]);

	const goJob = (app) => {
		const jobId = app.job?.id || app.job_id;
		if (!jobId) return;
		navigate(`/jobs/${jobId}`);
	};

	const goInterview = (e, tokenStr) => {
		e.stopPropagation();
		if (tokenStr) navigate(`/interview/${tokenStr}`);
	};

	return (
		<div className="dashboard-page">
			<div className="container">
				<div className="dashboard-header" style={{ marginBottom: "1.5rem" }}>
					<div>
						<button
							type="button"
							className="btn btn-outline"
							onClick={() => navigate("/candidate/home")}
							style={{
								marginBottom: "0.75rem",
								display: "inline-flex",
								alignItems: "center",
								gap: "0.5rem",
							}}
						>
							<ArrowLeft size={18} />
							Back to dashboard
						</button>
						<h1 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
							<Bell size={28} color="var(--accent-cyan)" aria-hidden />
							Notifications
						</h1>
						<p style={{ color: "var(--text-secondary)", marginTop: "0.35rem" }}>
							Updates on your applications and AI interviews (newest activity first).
							Opening this page clears the notification count on the bell.
						</p>
					</div>
				</div>

				{loading && (
					<div className="loading-spinner">
						<div className="spinner" />
						<p>Loading notifications…</p>
					</div>
				)}

				{error && !loading && (
					<div className="alert alert-error" role="alert">
						{error}
					</div>
				)}

				{!loading && !error && applications.length === 0 && (
					<div
						className="card"
						style={{
							padding: "2rem",
							textAlign: "center",
							color: "var(--text-secondary)",
						}}
					>
						<Bell size={40} style={{ opacity: 0.35, marginBottom: "0.75rem" }} />
						<p>No applications yet. When you apply to a role, status and interview updates will show here.</p>
					</div>
				)}

				{!loading && !error && applications.length > 0 && (
					<ul
						className="recruiter-notifications-list"
						style={{ listStyle: "none", padding: 0, margin: 0 }}
					>
						{applications.map((app) => {
							const iv = interviewByAppId[String(app.id)];
							const ivLine = interviewLabel(iv);
							const jobId = app.job?.id || app.job_id;
							const title = app.job?.title || iv?.job_title || "Job";
							const canOpenJob = Boolean(jobId);
							const showInterviewLink =
								iv?.interview_token &&
								iv.status !== "completed" &&
								iv.status !== "expired" &&
								iv.status !== "cancelled";

							return (
								<li key={app.id} style={{ marginBottom: "0.75rem" }}>
									<div
										role={canOpenJob ? "button" : undefined}
										tabIndex={canOpenJob ? 0 : -1}
										className="recruiter-notifications-item"
										onClick={() => canOpenJob && goJob(app)}
										onKeyDown={(e) => {
											if (!canOpenJob) return;
											if (e.key === "Enter" || e.key === " ") {
												e.preventDefault();
												goJob(app);
											}
										}}
										style={{
											width: "100%",
											textAlign: "left",
											display: "grid",
											gridTemplateColumns: "auto 1fr auto",
											gap: "1rem",
											alignItems: "center",
											padding: "1rem 1.25rem",
											borderRadius: "0.75rem",
											border: "1px solid var(--border)",
											background: "var(--bg-card)",
											color: "var(--text-primary)",
											cursor: canOpenJob ? "pointer" : "not-allowed",
											opacity: canOpenJob ? 1 : 0.85,
											transition:
												"border-color 0.15s ease, box-shadow 0.15s ease",
										}}
									>
										<div
											style={{
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												width: "2.75rem",
												height: "2.75rem",
												borderRadius: "0.5rem",
												background: "rgba(34, 211, 238, 0.12)",
												color: "var(--accent-cyan)",
											}}
										>
											<Briefcase size={20} aria-hidden />
										</div>
										<div style={{ minWidth: 0 }}>
											<div
												style={{
													fontWeight: 600,
													marginBottom: "0.25rem",
													lineHeight: 1.35,
												}}
											>
												<span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
													<Briefcase size={14} style={{ flexShrink: 0 }} aria-hidden />
													{title}
												</span>
											</div>
											<div
												style={{
													fontSize: "0.85rem",
													color: "var(--text-secondary)",
													marginBottom: "0.15rem",
												}}
											>
												{app.job?.company_name}
												{app.job?.location ? ` · ${app.job.location}` : ""}
											</div>
											<div
												style={{
													fontSize: "0.85rem",
													color: "var(--text-secondary)",
												}}
											>
												Last update {formatWhen(app.updatedAt)}
											</div>
											{ivLine && (
												<div
													style={{
														fontSize: "0.8rem",
														color: "var(--text-secondary)",
														marginTop: "0.35rem",
														display: "flex",
														alignItems: "center",
														gap: "0.35rem",
														flexWrap: "wrap",
													}}
												>
													<Video size={14} aria-hidden />
													<span>{ivLine}</span>
													{showInterviewLink && (
														<button
															type="button"
															className="btn btn-primary btn-sm"
															style={{ marginLeft: "0.25rem", padding: "0.2rem 0.55rem", fontSize: "0.75rem" }}
															onClick={(e) => goInterview(e, iv.interview_token)}
														>
															Open interview
														</button>
													)}
												</div>
											)}
										</div>
										<div
											style={{
												fontSize: "0.75rem",
												fontWeight: 600,
												padding: "0.25rem 0.6rem",
												borderRadius: "999px",
												background: "rgba(245, 158, 11, 0.15)",
												color: "#f59e0b",
												whiteSpace: "nowrap",
											}}
										>
											{statusLabel(app.status)}
										</div>
									</div>
								</li>
							);
						})}
					</ul>
				)}
			</div>
		</div>
	);
};

export default CandidateNotifications;
