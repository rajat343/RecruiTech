import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, Briefcase, User } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { graphqlRequest } from "../../utils/graphql";
import { markAllRecruiterJobApplicationsSeen } from "../../utils/recruiterApplicationNotifications";
import "../candidate/CandidateHome.css";
import "./RecruiterNotifications.css";

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

const RecruiterNotifications = () => {
	const navigate = useNavigate();
	const { user, loading: authLoading, token } = useAuth();
	const [items, setItems] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		if (!authLoading && (!user || user.role !== "recruiter")) {
			navigate("/login");
		}
	}, [user, authLoading, navigate]);

	useEffect(() => {
		const load = async () => {
			if (!token || user?.role !== "recruiter") return;
			setLoading(true);
			setError(null);
			try {
				const [feedData, jobsData] = await Promise.all([
					graphqlRequest(
						`
						query RecruiterApplicationsFeed($limit: Int!, $offset: Int!) {
							myRecruiterApplicationsFeed(limit: $limit, offset: $offset) {
								id
								job_id
								status
								createdAt
								job {
									id
									title
								}
								candidate {
									id
									first_name
									last_name
								}
							}
						}
						`,
						{ limit: 150, offset: 0 },
						token
					),
					graphqlRequest(
						`
						query RecruiterNotifMarkSeenJobs {
							myJobPosts(limit: 100, offset: 0) {
								id
								application_count
							}
						}
						`,
						{},
						token
					),
				]);

				const list = feedData.myRecruiterApplicationsFeed || [];
				setItems(list);

				if (user?.id) {
					markAllRecruiterJobApplicationsSeen(
						user.id,
						jobsData.myJobPosts || []
					);
				}
				window.dispatchEvent(new Event("recruiter-notifications-seen"));
			} catch (e) {
				console.error(e);
				setError(e.message || "Could not load notifications");
			} finally {
				setLoading(false);
			}
		};
		load();
	}, [token, user?.id, user?.role]);

	const candidateName = (c) => {
		if (!c) return "Candidate";
		const parts = [c.first_name, c.last_name].filter(Boolean);
		return parts.length ? parts.join(" ") : "Candidate";
	};

	const goApplicants = (jobId) => {
		if (!jobId) return;
		navigate(`/recruiter/jobs/${jobId}/applicants`);
	};

	return (
		<div className="dashboard-page">
			<div className="container">
				<div className="dashboard-header" style={{ marginBottom: "1.5rem" }}>
					<div>
						<button
							type="button"
							className="btn btn-outline"
							onClick={() => navigate("/recruiter/home")}
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
							New applications across your job posts (newest first). Select a row
							to open that job&apos;s applicant list.
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

				{!loading && !error && items.length === 0 && (
					<div
						className="card"
						style={{
							padding: "2rem",
							textAlign: "center",
							color: "var(--text-secondary)",
						}}
					>
						<Bell size={40} style={{ opacity: 0.35, marginBottom: "0.75rem" }} />
						<p>No applications yet. When candidates apply, they will appear here.</p>
					</div>
				)}

				{!loading && !error && items.length > 0 && (
					<ul
						className="recruiter-notifications-list"
						style={{ listStyle: "none", padding: 0, margin: 0 }}
					>
						{items.map((app) => {
							const jobId = app.job?.id || app.job_id;
							const title = app.job?.title || "Job";
							const name = candidateName(app.candidate);
							return (
								<li key={app.id} style={{ marginBottom: "0.75rem" }}>
									<button
										type="button"
										onClick={() => goApplicants(jobId)}
										className="recruiter-notifications-item"
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
											cursor: "pointer",
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
											<User size={20} aria-hidden />
										</div>
										<div style={{ minWidth: 0 }}>
											<div
												style={{
													fontWeight: 600,
													marginBottom: "0.25rem",
													lineHeight: 1.35,
												}}
											>
												<span style={{ color: "var(--accent-cyan)" }}>
													{name}
												</span>{" "}
												applied to{" "}
												<span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
													<Briefcase size={14} style={{ flexShrink: 0 }} aria-hidden />
													{title}
												</span>
											</div>
											<div
												style={{
													fontSize: "0.85rem",
													color: "var(--text-secondary)",
												}}
											>
												{formatWhen(app.createdAt)}
											</div>
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
									</button>
								</li>
							);
						})}
					</ul>
				)}
			</div>
		</div>
	);
};

export default RecruiterNotifications;
