import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
	ArrowLeft,
	Briefcase,
	Building2,
	Calendar,
	CheckCircle,
	Clock,
	DollarSign,
	GraduationCap,
	MapPin,
	Send,
	Users,
	X,
	AlertTriangle,
	BarChart3,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { graphqlRequest } from "../../utils/graphql";
import "../candidate/CandidateHome.css";
import "../candidate/CandidateJobs.css";

const formatDate = (isoString) => {
	if (!isoString) return "";
	try {
		return new Date(isoString).toLocaleDateString(undefined, {
			month: "long",
			day: "numeric",
			year: "numeric",
		});
	} catch {
		return "";
	}
};

const formatSalary = (min, max, currency = "USD") => {
	const fmt = (n) => (n >= 1000 ? `${(n / 1000).toFixed(0)}k` : n.toString());
	if (!min && !max) return null;
	const parts = [];
	if (min) parts.push(fmt(min));
	if (max) parts.push(fmt(max));
	return `${currency} ${parts.join(" – ")}`;
};

const titleCase = (s) =>
	(s || "")
		.replace(/_/g, " ")
		.replace(/\b\w/g, (c) => c.toUpperCase());

const JOB_QUERY = `
	query Job($id: ID!) {
		job(id: $id) {
			id
			recruiter_id
			company_id
			company_name
			title
			description
			employment_type
			experience_level
			location_type
			location
			deadline
			salary_min
			salary_max
			salary_currency
			skills
			apply_url
			is_active
			application_count
			createdAt
		}
	}
`;

const JobDetails = () => {
	const { jobId } = useParams();
	const navigate = useNavigate();
	const { user, loading: authLoading, token } = useAuth();

	const [job, setJob] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const [hasApplied, setHasApplied] = useState(false);
	const [showApplyModal, setShowApplyModal] = useState(false);
	const [coverLetter, setCoverLetter] = useState("");
	const [resumeUrl, setResumeUrl] = useState("");
	const [applyLoading, setApplyLoading] = useState(false);
	const [applyError, setApplyError] = useState(null);
	const [applySuccess, setApplySuccess] = useState(false);

	const [recruiterProfileId, setRecruiterProfileId] = useState(null);

	useEffect(() => {
		if (!authLoading && !user) {
			navigate("/login");
		}
	}, [user, authLoading, navigate]);

	useEffect(() => {
		const load = async () => {
			if (!token || !jobId) return;
			setLoading(true);
			setError(null);
			try {
				const data = await graphqlRequest(JOB_QUERY, { id: jobId }, token);
				setJob(data.job);

				if (user?.role === "candidate") {
					try {
						const appliedData = await graphqlRequest(
							`query HasApplied($job_id: ID!) { hasApplied(job_id: $job_id) }`,
							{ job_id: jobId },
							token
						);
						setHasApplied(!!appliedData.hasApplied);
					} catch (appsErr) {
						console.error("Error checking applied state:", appsErr);
					}
				} else if (user?.role === "recruiter") {
					try {
						const profileData = await graphqlRequest(
							`query { myRecruiterProfile { id } }`,
							{},
							token
						);
						setRecruiterProfileId(profileData.myRecruiterProfile?.id);
					} catch (profileErr) {
						console.error("Error fetching recruiter profile:", profileErr);
					}
				}
			} catch (err) {
				console.error("Error loading job:", err);
				setError(err.message || "Failed to load job");
			} finally {
				setLoading(false);
			}
		};
		if (!authLoading) load();
	}, [token, jobId, authLoading, user]);

	const deadlineDate = job?.deadline ? new Date(job.deadline) : null;
	const now = Date.now();
	const deadlinePassed = deadlineDate ? deadlineDate.getTime() < now : false;
	const msPerDay = 1000 * 60 * 60 * 24;
	const daysLeft = deadlineDate
		? Math.max(0, Math.ceil((deadlineDate.getTime() - now) / msPerDay))
		: null;
	const isUrgent = daysLeft !== null && !deadlinePassed && daysLeft <= 3;

	const accentColor = useMemo(() => {
		if (deadlinePassed) return "#ef4444";
		if (isUrgent) return "#f59e0b";
		return "var(--accent-cyan)";
	}, [deadlinePassed, isUrgent]);

	const isOwnerRecruiter =
		user?.role === "recruiter" &&
		recruiterProfileId &&
		job?.recruiter_id === recruiterProfileId;

	const handleApplyClick = () => {
		setCoverLetter("");
		setResumeUrl("");
		setApplyError(null);
		setApplySuccess(false);
		setShowApplyModal(true);
	};

	const handleSubmitApplication = async (e) => {
		e.preventDefault();
		setApplyLoading(true);
		setApplyError(null);
		try {
			await graphqlRequest(
				`
				mutation ApplyToJob($input: ApplyInput!) {
					applyToJob(input: $input) {
						id
						status
					}
				}
				`,
				{
					input: {
						job_id: jobId,
						cover_letter: coverLetter || null,
						resume_url: resumeUrl || null,
					},
				},
				token
			);
			setHasApplied(true);
			setApplySuccess(true);
		} catch (err) {
			setApplyError(err.message || "Failed to submit application");
		} finally {
			setApplyLoading(false);
		}
	};

	const handleCloseApplyModal = () => {
		setShowApplyModal(false);
		setApplySuccess(false);
	};

	const handleBack = () => {
		if (window.history.length > 1) navigate(-1);
		else if (user?.role === "recruiter") navigate("/recruiter/home");
		else navigate("/candidate/jobs");
	};

	if (authLoading || loading) {
		return (
			<div className="dashboard-page">
				<div className="container">
					<div className="loading-spinner">
						<div className="spinner"></div>
						<p>Loading job...</p>
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
					<button className="btn btn-primary" onClick={handleBack}>
						<ArrowLeft size={16} /> Go back
					</button>
				</div>
			</div>
		);
	}

	const salary = formatSalary(job.salary_min, job.salary_max, job.salary_currency);

	return (
		<div className="dashboard-page">
			<div className="container" style={{ paddingTop: "1.5rem", maxWidth: "1100px" }}>
				<button
					className="btn btn-outline btn-sm"
					onClick={handleBack}
					style={{ marginBottom: "1.25rem" }}
				>
					<ArrowLeft size={14} /> Back
				</button>

				<div
					style={{
						background: "var(--bg-card)",
						border: "1px solid var(--border)",
						borderRadius: "1rem",
						overflow: "hidden",
						position: "relative",
					}}
				>
					<span
						aria-hidden
						style={{
							position: "absolute",
							top: 0,
							left: 0,
							bottom: 0,
							width: 5,
							background: accentColor,
							opacity: 0.85,
						}}
					/>

					<div
						style={{
							padding: "2rem 2rem 1.5rem 2.25rem",
							borderBottom: "1px solid var(--border)",
						}}
					>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "flex-start",
								gap: "1.25rem",
								flexWrap: "wrap",
							}}
						>
							<div style={{ display: "flex", gap: "1rem", alignItems: "flex-start", minWidth: 0, flex: 1 }}>
								<div
									style={{
										width: 56,
										height: 56,
										borderRadius: "0.7rem",
										background: "rgba(34, 211, 238, 0.1)",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										flexShrink: 0,
									}}
								>
									<Briefcase size={26} style={{ color: "var(--accent-cyan)" }} />
								</div>
								<div style={{ minWidth: 0 }}>
									<h1
										style={{
											margin: 0,
											fontSize: "1.7rem",
											fontWeight: 700,
											color: "var(--text-primary)",
											textTransform: "capitalize",
											lineHeight: 1.2,
										}}
									>
										{job.title}
									</h1>
									<div
										style={{
											marginTop: "0.5rem",
											display: "flex",
											gap: "1rem",
											flexWrap: "wrap",
											fontSize: "0.9rem",
											color: "var(--text-secondary)",
										}}
									>
										<span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
											<Building2 size={14} />
											{job.company_name || "Company"}
										</span>
										<span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
											<MapPin size={14} />
											{job.location_type === "remote" ? "Remote" : job.location}
										</span>
										<span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
											<Calendar size={14} />
											Posted {formatDate(job.createdAt)}
										</span>
									</div>
								</div>
							</div>

							{deadlineDate && (
								<span
									style={{
										padding: "0.4rem 0.85rem",
										borderRadius: "1rem",
										fontSize: "0.8rem",
										fontWeight: 600,
										background: `${accentColor}1f`,
										color: accentColor,
										border: `1px solid ${accentColor}55`,
										display: "inline-flex",
										alignItems: "center",
										gap: "0.4rem",
										whiteSpace: "nowrap",
									}}
								>
									<Clock size={13} />
									{deadlinePassed
										? `Closed on ${formatDate(job.deadline)}`
										: daysLeft === 0
										? "Closes today"
										: `${daysLeft} day${daysLeft === 1 ? "" : "s"} left to apply`}
								</span>
							)}
						</div>

						<div
							style={{
								marginTop: "1.5rem",
								display: "grid",
								gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
								gap: "0.75rem",
							}}
						>
							<DetailCell icon={<Briefcase size={14} />} label="Type" value={titleCase(job.employment_type)} />
							<DetailCell icon={<GraduationCap size={14} />} label="Experience" value={titleCase(job.experience_level)} />
							<DetailCell icon={<MapPin size={14} />} label="Work Mode" value={titleCase(job.location_type)} />
							{salary && <DetailCell icon={<DollarSign size={14} />} label="Salary" value={salary} />}
							<DetailCell
								icon={<Calendar size={14} />}
								label="Deadline"
								value={deadlineDate ? formatDate(job.deadline) : "—"}
							/>
							{user?.role === "recruiter" && (
								<DetailCell
									icon={<Users size={14} />}
									label="Applicants"
									value={job.application_count || 0}
								/>
							)}
						</div>
					</div>

					<div style={{ padding: "1.5rem 2rem 2rem 2.25rem" }}>
						<h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem", color: "var(--text-primary)" }}>
							About the role
						</h2>
						<div
							style={{
								color: "var(--text-secondary)",
								lineHeight: 1.7,
								whiteSpace: "pre-wrap",
								fontSize: "0.95rem",
							}}
						>
							{job.description || "No description provided."}
						</div>

						{Array.isArray(job.skills) && job.skills.length > 0 && (
							<>
								<h2 style={{ fontSize: "1.1rem", marginTop: "1.75rem", marginBottom: "0.75rem", color: "var(--text-primary)" }}>
									Required skills
								</h2>
								<div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
									{job.skills.map((skill) => (
										<span className="tag" key={skill}>
											{skill}
										</span>
									))}
								</div>
							</>
						)}
					</div>

					<div
						style={{
							padding: "1.25rem 2rem 1.5rem 2.25rem",
							borderTop: "1px solid var(--border)",
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							gap: "1rem",
							flexWrap: "wrap",
							background: "var(--bg-dark)",
						}}
					>
						<div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
							{deadlinePassed
								? "Applications are closed for this role."
								: daysLeft !== null
								? `Apply by ${formatDate(job.deadline)} • ${daysLeft} day${daysLeft === 1 ? "" : "s"} left`
								: "Open for applications."}
						</div>

						<div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
							{user?.role === "candidate" && (
								<>
									{hasApplied ? (
										<span
											className="btn-applied"
											style={{
												padding: "0.6rem 1.1rem",
												fontSize: "0.9rem",
												borderRadius: "0.6rem",
											}}
										>
											<CheckCircle size={16} /> Already applied
										</span>
									) : deadlinePassed ? (
										<span
											style={{
												padding: "0.6rem 1.1rem",
												borderRadius: "0.6rem",
												background: "rgba(239, 68, 68, 0.12)",
												color: "#ef4444",
												border: "1px solid rgba(239, 68, 68, 0.3)",
												fontWeight: 600,
												fontSize: "0.9rem",
												display: "inline-flex",
												alignItems: "center",
												gap: "0.4rem",
											}}
										>
											<X size={16} /> Applications closed
										</span>
									) : (
										<button className="btn btn-primary" onClick={handleApplyClick}>
											<Send size={16} /> Apply Now
										</button>
									)}
								</>
							)}

							{isOwnerRecruiter && (
								<>
									<button
										className="btn btn-outline"
										onClick={() => navigate("/recruiter/home")}
									>
										<Briefcase size={16} /> Manage Jobs
									</button>
									<button
										className="btn btn-primary"
										onClick={() => navigate(`/recruiter/jobs/${job.id}/applicants`)}
									>
										<BarChart3 size={16} />
										View Applicants ({job.application_count || 0})
									</button>
								</>
							)}
						</div>
					</div>
				</div>
			</div>

			{showApplyModal && (
				<div className="modal-overlay" onClick={handleCloseApplyModal}>
					<div
						className="modal-content"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="modal-header">
							<h2>{applySuccess ? "Application Sent!" : "Apply for this Role"}</h2>
							<button className="modal-close" onClick={handleCloseApplyModal}>
								<X size={24} />
							</button>
						</div>
						<div className="modal-body">
							<div className="apply-modal-job-info">
								<h3>{job.title}</h3>
								<p>
									{job.company_name || "Company"} • {job.location}
								</p>
							</div>

							{applySuccess ? (
								<div style={{ textAlign: "center", padding: "1.5rem 0" }}>
									<CheckCircle size={48} style={{ color: "#10b981", marginBottom: "0.75rem" }} />
									<p style={{ fontSize: "1rem", color: "var(--text-primary)", marginBottom: "1rem" }}>
										Your application has been submitted successfully.
									</p>
									<button className="btn btn-primary" onClick={handleCloseApplyModal}>
										Done
									</button>
								</div>
							) : (
								<form onSubmit={handleSubmitApplication}>
									{applyError && (
										<div className="alert alert-error" style={{ marginBottom: "1rem" }}>
											{applyError}
										</div>
									)}
									<div className="form-group">
										<label htmlFor="resume_url">Resume URL (optional)</label>
										<input
											type="url"
											id="resume_url"
											className="input-field"
											placeholder="https://..."
											value={resumeUrl}
											onChange={(e) => setResumeUrl(e.target.value)}
										/>
										<p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.35rem" }}>
											Leave blank to use the resume on your profile.
										</p>
									</div>
									<div className="form-group">
										<label htmlFor="cover_letter">Cover Letter (optional)</label>
										<textarea
											id="cover_letter"
											className="input-field"
											rows={6}
											placeholder="Tell the recruiter why you're a great fit..."
											value={coverLetter}
											onChange={(e) => setCoverLetter(e.target.value)}
										/>
									</div>
									<div className="modal-actions">
										<button
											type="button"
											className="btn btn-outline"
											onClick={handleCloseApplyModal}
											disabled={applyLoading}
										>
											Cancel
										</button>
										<button
											type="submit"
											className="btn btn-primary"
											disabled={applyLoading}
										>
											{applyLoading ? "Submitting..." : "Submit Application"}
										</button>
									</div>
								</form>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

const DetailCell = ({ icon, label, value }) => (
	<div
		style={{
			background: "var(--bg-dark)",
			border: "1px solid var(--border)",
			borderRadius: "0.6rem",
			padding: "0.7rem 0.9rem",
		}}
	>
		<div
			style={{
				display: "flex",
				alignItems: "center",
				gap: "0.35rem",
				color: "var(--text-secondary)",
				fontSize: "0.7rem",
				fontWeight: 600,
				textTransform: "uppercase",
				letterSpacing: "0.05em",
				marginBottom: "0.3rem",
			}}
		>
			{icon}
			{label}
		</div>
		<div style={{ color: "var(--text-primary)", fontSize: "0.95rem", fontWeight: 600 }}>
			{value}
		</div>
	</div>
);

export default JobDetails;
