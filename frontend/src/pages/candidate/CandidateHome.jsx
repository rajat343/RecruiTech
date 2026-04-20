import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { graphqlRequest } from "../../utils/graphql";
import {
	Briefcase,
	FileText,
	Settings,
	TrendingUp,
	CheckCircle,
	X,
	User,
	Phone,
	Link,
	FileText as FileTextIcon,
	Github,
	Code,
	Globe,
	Search,
	Building2,
	Send,
	Clock,
} from "lucide-react";
import "./CandidateHome.css";

const CandidateHome = () => {
	const { user, loading: authLoading, token } = useAuth();
	const navigate = useNavigate();
	const [candidate, setCandidate] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [showEditModal, setShowEditModal] = useState(false);
	const [profileForm, setProfileForm] = useState({
		// Core
		first_name: "",
		last_name: "",
		phone_number: "",
		// Location
		location_city: "",
		location_state: "",
		location_country: "",
		// Work eligibility
		work_authorized: null,
		sponsorship_needed: null,
		// Links
		resume_url: "",
		linkedin_url: "",
		github_url: "",
		leetcode_url: "",
		portfolio_url: "",
		// Professional summary
		skills: "",
		profile_summary: "",
		status: "actively_looking",
		// Demographics
		demographics_race_ethnicity: "",
		demographics_gender: "",
		demographics_disability: "",
	});
	const [saving, setSaving] = useState(false);
	const [editError, setEditError] = useState(null);
	const [applicationCount, setApplicationCount] = useState(0);
	const [recentApplications, setRecentApplications] = useState([]);
	const [recentJobs, setRecentJobs] = useState([]);

	useEffect(() => {
		if (!authLoading && (!user || user.role !== "candidate")) {
			navigate("/login");
			return;
		}

		const fetchProfile = async () => {
			if (!token) return;

			try {
				const data = await graphqlRequest(
					`
					query GetCandidateDashboard {
						myCandidateProfile {
							id
							first_name
							last_name
							email
							phone_number
							status
							location_city
							location_state
							location_country
							work_authorized
							sponsorship_needed
							resume_url
							linkedin_url
							github_url
							leetcode_url
							portfolio_url
							skills
							profile_summary
							demographics {
								race_ethnicity
								gender
								disability
							}
						}
						myApplicationCount
						myApplications(limit: 200) {
							id
							job_id
							status
							createdAt
							job {
								id
								title
								company_name
								location
							}
						}
						searchJobs(limit: 10) {
							jobs {
								id
								title
								description
								company_name
								location
								location_type
								employment_type
								skills
							}
						}
					}
					`,
					{},
					token
				);
				setCandidate(data.myCandidateProfile);
				setApplicationCount(data.myApplicationCount || 0);
				const apps = data.myApplications || [];
				setRecentApplications(apps.slice(0, 5));
				const appliedJobIds = new Set(apps.map((a) => a.job_id));
				const latestOpenings = (data.searchJobs?.jobs || []).filter(
					(job) => !appliedJobIds.has(job.id)
				);
				setRecentJobs(latestOpenings);
				setLoading(false);
			} catch (err) {
				console.error("Fetch profile error:", err);
				setError(err);
				setLoading(false);
			}
		};

		if (user && token) {
			fetchProfile();
		}
	}, [user, authLoading, navigate, token]);

	if (authLoading || loading) {
		return (
			<div className="dashboard-page">
				<div className="container">
					<div className="loading-spinner">
						<div className="spinner"></div>
						<p>Loading your dashboard...</p>
					</div>
				</div>
			</div>
		);
	}

	if (error) {
		// Profile doesn't exist, redirect to onboarding
		navigate("/candidate/onboarding");
		return null;
	}

	const handleEditProfile = () => {
		setProfileForm({
			first_name: candidate.first_name,
			last_name: candidate.last_name,
			phone_number: candidate.phone_number || "",
			location_city: candidate.location_city || "",
			location_state: candidate.location_state || "",
			location_country: candidate.location_country || "",
			work_authorized:
				typeof candidate.work_authorized === "boolean"
					? candidate.work_authorized
					: null,
			sponsorship_needed:
				typeof candidate.sponsorship_needed === "boolean"
					? candidate.sponsorship_needed
					: null,
			resume_url: candidate.resume_url || "",
			linkedin_url: candidate.linkedin_url || "",
			github_url: candidate.github_url || "",
			leetcode_url: candidate.leetcode_url || "",
			portfolio_url: candidate.portfolio_url || "",
							skills: Array.isArray(candidate.skills)
				? candidate.skills.join(", ")
				: "",
			profile_summary: candidate.profile_summary || "",
			status: candidate.status,
			demographics_race_ethnicity:
				candidate.demographics?.race_ethnicity || "",
			demographics_gender: candidate.demographics?.gender || "",
			demographics_disability:
				candidate.demographics?.disability || "",
		});
		setShowEditModal(true);
		setEditError(null);
	};

	const handleSaveProfile = async (e) => {
		e.preventDefault();
		setEditError(null);
		setSaving(true);

		try {
			const data = await graphqlRequest(
				`
				mutation UpdateCandidate($id: ID!, $input: CandidateUpdateInput!) {
					updateCandidate(id: $id, input: $input) {
						id
						first_name
						last_name
						phone_number
						location_city
						location_state
						location_country
						work_authorized
						sponsorship_needed
						resume_url
						linkedin_url
						github_url
						leetcode_url
						portfolio_url
						skills
						profile_summary
						status
						demographics {
							race_ethnicity
							gender
							disability
						}
					}
				}
				`,
				{
					id: candidate.id,
					input: {
						first_name: profileForm.first_name,
						last_name: profileForm.last_name,
						phone_number: profileForm.phone_number || null,
						// Location
						location_city: profileForm.location_city || null,
						location_state: profileForm.location_state || null,
						location_country: profileForm.location_country || null,
						// Work eligibility
						work_authorized:
							profileForm.work_authorized !== null
								? profileForm.work_authorized
								: null,
						sponsorship_needed:
							profileForm.sponsorship_needed !== null
								? profileForm.sponsorship_needed
								: null,
						// Links
						resume_url: profileForm.resume_url || null,
						linkedin_url: profileForm.linkedin_url || null,
						github_url: profileForm.github_url || null,
						leetcode_url: profileForm.leetcode_url || null,
						portfolio_url: profileForm.portfolio_url || null,
						// Professional summary
						skills: profileForm.skills
							? profileForm.skills
									.split(",")
									.map((s) => s.trim())
									.filter(Boolean)
							: null,
						profile_summary:
							profileForm.profile_summary || null,
						// Status & demographics
						status: profileForm.status,
						demographics: {
							race_ethnicity:
								profileForm.demographics_race_ethnicity || null,
							gender: profileForm.demographics_gender || null,
							disability:
								profileForm.demographics_disability || null,
						},
					},
				},
				token
			);

			// Update local state
			setCandidate({
				...candidate,
				...data.updateCandidate,
			});

			// Close modal
			setShowEditModal(false);
		} catch (err) {
			console.error("Error updating profile:", err);
			setEditError(err.message || "Failed to update profile");
		} finally {
			setSaving(false);
		}
	};

	const handleCloseModal = () => {
		setShowEditModal(false);
		setEditError(null);
	};

	return (
		<div className="dashboard-page">
			<div className="container">
				<div className="dashboard-header">
					<div>
						<h1>
							Welcome back, {candidate?.first_name || "Candidate"}
							! 👋
						</h1>
						<p>Here's what's happening with your job search</p>
					</div>
					<button
						className="btn btn-primary"
						onClick={handleEditProfile}
					>
						<Settings size={20} />
						Edit Profile
					</button>
				</div>

				<div className="stats-grid">
					<div className="stat-card" onClick={() => navigate("/candidate/jobs")} style={{ cursor: "pointer" }}>
						<div
							className="stat-icon"
							style={{ background: "rgba(34, 211, 238, 0.1)" }}
						>
							<Search
								size={24}
								style={{ color: "var(--accent-cyan)" }}
							/>
						</div>
						<div className="stat-content">
							<div className="stat-value">Find Jobs</div>
							<div className="stat-label">Browse all openings</div>
						</div>
					</div>

					<div className="stat-card">
						<div
							className="stat-icon"
							style={{ background: "rgba(16, 185, 129, 0.1)" }}
						>
							<Send
								size={24}
								style={{ color: "#10b981" }}
							/>
						</div>
						<div className="stat-content">
							<div className="stat-value">{applicationCount}</div>
							<div className="stat-label">Applications</div>
						</div>
					</div>

					<div className="stat-card">
						<div
							className="stat-icon"
							style={{ background: "rgba(245, 158, 11, 0.1)" }}
						>
							<Clock
								size={24}
								style={{ color: "#f59e0b" }}
							/>
						</div>
						<div className="stat-content">
							<div className="stat-value">
								{recentApplications.filter((a) => a.status === "pending").length}
							</div>
							<div className="stat-label">Pending</div>
						</div>
					</div>

					<div className="stat-card">
						<div
							className="stat-icon"
							style={{ background: "rgba(139, 92, 246, 0.1)" }}
						>
							<CheckCircle size={24} style={{ color: "#8b5cf6" }} />
						</div>
						<div className="stat-content">
							<div className="stat-value">
								{recentApplications.filter((a) => a.status === "shortlisted").length}
							</div>
							<div className="stat-label">Shortlisted</div>
						</div>
					</div>
				</div>

				<div className="dashboard-content">
					<div className="dashboard-section">
						<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
							<h2 style={{ margin: 0 }}>Latest Openings</h2>
							<button className="btn btn-outline btn-sm" onClick={() => navigate("/candidate/jobs")}>
								<Search size={14} />
								Browse All Jobs
							</button>
						</div>
						<div className="job-list">
							{recentJobs.length === 0 ? (
								<div className="job-card">
									<div className="job-header">
										<div className="job-icon">
											<Briefcase size={24} />
										</div>
										<div>
											<h3>
												{applicationCount > 0
													? "No new openings here"
													: "No jobs available yet"}
											</h3>
											<p>
												{applicationCount > 0
													? "You've already applied to the newest listings shown here. Browse all jobs to find more roles you have not applied to yet."
													: "Check back soon for new openings!"}
											</p>
											{applicationCount > 0 && (
												<button
													type="button"
													className="btn btn-primary btn-sm"
													style={{ marginTop: "0.75rem" }}
													onClick={() => navigate("/candidate/jobs")}
												>
													<Search size={14} />
													Browse all jobs
												</button>
											)}
										</div>
									</div>
								</div>
							) : (
								recentJobs.map((job) => (
									<div className="job-card" key={job.id}>
										<div className="job-header">
											<div className="job-icon">
												<Building2 size={22} style={{ color: "var(--accent-cyan)" }} />
											</div>
											<div>
												<h3
													style={{ cursor: "pointer" }}
													onClick={() => navigate(`/jobs/${job.id}`)}
													title="View full job posting"
												>
													{job.title}
												</h3>
												<p>{job.company_name || "Company"} &bull; {job.location}</p>
											</div>
										</div>
										<p className="job-description">
											{job.description && job.description.length > 150
												? `${job.description.slice(0, 147)}...`
												: job.description}
										</p>
										<div className="job-tags">
											{job.location_type && (
												<span className="tag">
													{job.location_type === "remote" ? "Remote" : job.location_type.charAt(0).toUpperCase() + job.location_type.slice(1)}
												</span>
											)}
											{Array.isArray(job.skills) && job.skills.slice(0, 3).map((skill) => (
												<span className="tag" key={`${job.id}-${skill}`}>{skill}</span>
											))}
										</div>
										<button
											className="btn btn-primary btn-sm"
											onClick={() => navigate(`/jobs/${job.id}`)}
										>
											View & Apply
										</button>
									</div>
								))
							)}
						</div>

						{recentApplications.length > 0 && (
							<>
								<h2 style={{ marginTop: "2.5rem" }}>My Recent Applications</h2>
								<div className="job-list">
									{recentApplications.map((app) => (
										<div className="job-card" key={app.id}>
											<div className="job-header">
												<div className="job-icon">
													<FileText size={22} style={{ color: "var(--accent-cyan)" }} />
												</div>
												<div>
													<h3>{app.job?.title || "Job"}</h3>
													<p>{app.job?.company_name || "Company"} &bull; {app.job?.location || ""}</p>
												</div>
											</div>
											<div className="job-tags">
												<span className="tag" style={{
													background: app.status === "shortlisted"
														? "rgba(16, 185, 129, 0.15)"
														: app.status === "rejected"
														? "rgba(239, 68, 68, 0.15)"
														: "rgba(245, 158, 11, 0.15)",
													color: app.status === "shortlisted"
														? "#10b981"
														: app.status === "rejected"
														? "#ef4444"
														: "#f59e0b",
												}}>
													{app.status.charAt(0).toUpperCase() + app.status.slice(1)}
												</span>
												<span className="tag">
													Applied {new Date(app.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
												</span>
											</div>
										</div>
									))}
								</div>
							</>
						)}
					</div>

					<div className="dashboard-sidebar">
						<div className="profile-card card">
							<h3>Your Profile</h3>
							<div className="profile-stats">
								<div className="profile-stat-item">
									<span className="label">Status:</span>
									<span className="value status-badge">
										{candidate?.status?.replace("_", " ")}
									</span>
								</div>
							</div>
							<button
								className="btn btn-outline btn-full btn-sm"
								onClick={handleEditProfile}
							>
								<Settings size={16} />
								Edit Profile
							</button>
						</div>

						<div className="profile-card card">
							<h3>Job Search</h3>
							<p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "1rem" }}>
								Browse all available positions and find your perfect role
							</p>
							<button
								className="btn btn-primary btn-full btn-sm"
								onClick={() => navigate("/candidate/jobs")}
							>
								<Search size={16} />
								Search Jobs
							</button>
						</div>

						<div className="tips-card card">
							<h3>Quick Tips</h3>
							<ul className="tips-list">
								<li>✨ Update your skills regularly</li>
								<li>📝 Keep your resume current</li>
								<li>🎯 Apply to jobs that match your skills</li>
								<li>💬 Write a cover letter for each application</li>
							</ul>
						</div>
					</div>
				</div>

				{/* Edit Profile Modal */}
				{showEditModal && (
					<div className="modal-overlay" onClick={handleCloseModal}>
						<div
							className="modal-content modal-large"
							onClick={(e) => e.stopPropagation()}
						>
							<div className="modal-header">
								<h2>Edit Profile</h2>
								<button
									className="modal-close"
									onClick={handleCloseModal}
								>
									<X size={24} />
								</button>
							</div>
							<div className="modal-body">
								{editError && (
									<div className="alert alert-error">
										{editError}
									</div>
								)}

								<form onSubmit={handleSaveProfile}>
									{/* Personal Information */}
									<div className="form-section">
										<h3 className="form-section-title">
											<User size={18} />
											Personal Information
										</h3>
										<div className="form-row">
											<div className="form-group">
												<label htmlFor="first_name">
													First Name *
												</label>
												<input
													type="text"
													id="first_name"
													className="input-field"
													value={
														profileForm.first_name
													}
													onChange={(e) =>
														setProfileForm({
															...profileForm,
															first_name:
																e.target.value,
														})
													}
													required
												/>
											</div>
											<div className="form-group">
												<label htmlFor="last_name">
													Last Name *
												</label>
												<input
													type="text"
													id="last_name"
													className="input-field"
													value={
														profileForm.last_name
													}
													onChange={(e) =>
														setProfileForm({
															...profileForm,
															last_name:
																e.target.value,
														})
													}
													required
												/>
											</div>
										</div>
										<div className="form-group">
											<label htmlFor="phone_number">
												<Phone size={16} />
												Phone Number
											</label>
											<input
												type="tel"
												id="phone_number"
												className="input-field"
												placeholder="+1 (555) 123-4567"
												value={profileForm.phone_number}
												onChange={(e) =>
													setProfileForm({
														...profileForm,
														phone_number:
															e.target.value,
													})
												}
											/>
										</div>

										<div className="form-row">
											<div className="form-group">
												<label htmlFor="location_city">
													City
												</label>
												<input
													type="text"
													id="location_city"
													className="input-field"
													value={
														profileForm.location_city
													}
													onChange={(e) =>
														setProfileForm({
															...profileForm,
															location_city:
																e.target.value,
														})
													}
												/>
											</div>
											<div className="form-group">
												<label htmlFor="location_state">
													State / Province
												</label>
												<input
													type="text"
													id="location_state"
													className="input-field"
													value={
														profileForm.location_state
													}
													onChange={(e) =>
														setProfileForm({
															...profileForm,
															location_state:
																e.target.value,
														})
													}
												/>
											</div>
										</div>

										<div className="form-group">
											<label htmlFor="location_country">
												Country
											</label>
											<input
												type="text"
												id="location_country"
												className="input-field"
												value={
													profileForm.location_country
												}
												onChange={(e) =>
													setProfileForm({
														...profileForm,
														location_country:
															e.target.value,
													})
												}
											/>
										</div>
									</div>

									{/* Work Eligibility */}
									<div className="form-section">
										<h3 className="form-section-title">
											<Briefcase size={18} />
											Work Eligibility
										</h3>
										<div className="form-group">
											<label>Work authorization</label>
											<div className="radio-group">
												<button
													type="button"
													className={`chip-button ${
														profileForm.work_authorized ===
														true
															? "selected"
															: ""
													}`}
													onClick={() =>
														setProfileForm({
															...profileForm,
															work_authorized:
																true,
														})
													}
												>
													Yes, I am authorized to
													work without restrictions
												</button>
												<button
													type="button"
													className={`chip-button ${
														profileForm.work_authorized ===
														false
															? "selected"
															: ""
													}`}
													onClick={() =>
														setProfileForm({
															...profileForm,
															work_authorized:
																false,
														})
													}
												>
													No, I am not currently
													authorized
												</button>
											</div>
										</div>

										<div className="form-group">
											<label>
												Will you require visa
												sponsorship now or in the
												future?
											</label>
											<div className="radio-group">
												<button
													type="button"
													className={`chip-button ${
														profileForm.sponsorship_needed ===
														true
															? "selected"
															: ""
													}`}
													onClick={() =>
														setProfileForm({
															...profileForm,
															sponsorship_needed:
																true,
														})
													}
												>
													Yes, I will need
													sponsorship
												</button>
												<button
													type="button"
													className={`chip-button ${
														profileForm.sponsorship_needed ===
														false
															? "selected"
															: ""
													}`}
													onClick={() =>
														setProfileForm({
															...profileForm,
															sponsorship_needed:
																false,
														})
													}
												>
													No, I will not need
													sponsorship
												</button>
											</div>
										</div>
									</div>

									{/* Links & URLs */}
									<div className="form-section">
										<h3 className="form-section-title">
											<Link size={18} />
											Links & URLs
										</h3>
										<div className="form-group">
											<label htmlFor="skills">
												Skills (comma-separated)
											</label>
											<input
												type="text"
												id="skills"
												className="input-field"
												placeholder="React, TypeScript, GraphQL"
												value={profileForm.skills}
												onChange={(e) =>
													setProfileForm({
														...profileForm,
														skills: e.target.value,
													})
												}
											/>
										</div>
										<div className="form-group">
											<label htmlFor="resume_url">
												<FileTextIcon size={16} />
												Resume URL *
											</label>
											<input
												type="url"
												id="resume_url"
												className="input-field"
												placeholder="https://example.com/resume.pdf"
												value={profileForm.resume_url}
												onChange={(e) =>
													setProfileForm({
														...profileForm,
														resume_url:
															e.target.value,
													})
												}
												required
											/>
										</div>
										<div className="form-group">
											<label htmlFor="github_url">
												<Github size={16} />
												GitHub URL
											</label>
											<input
												type="url"
												id="github_url"
												className="input-field"
												placeholder="https://github.com/username"
												value={profileForm.github_url}
												onChange={(e) =>
													setProfileForm({
														...profileForm,
														github_url:
															e.target.value,
													})
												}
											/>
										</div>
										<div className="form-group">
											<label htmlFor="linkedin_url">
												<Globe size={16} />
												LinkedIn URL
											</label>
											<input
												type="url"
												id="linkedin_url"
												className="input-field"
												placeholder="https://linkedin.com/in/username"
												value={profileForm.linkedin_url}
												onChange={(e) =>
													setProfileForm({
														...profileForm,
														linkedin_url:
															e.target.value,
													})
												}
											/>
										</div>
										<div className="form-group">
											<label htmlFor="leetcode_url">
												<Code size={16} />
												LeetCode URL
											</label>
											<input
												type="url"
												id="leetcode_url"
												className="input-field"
												placeholder="https://leetcode.com/username"
												value={profileForm.leetcode_url}
												onChange={(e) =>
													setProfileForm({
														...profileForm,
														leetcode_url:
															e.target.value,
													})
												}
											/>
										</div>
										<div className="form-group">
											<label htmlFor="portfolio_url">
												<Globe size={16} />
												Portfolio URL
											</label>
											<input
												type="url"
												id="portfolio_url"
												className="input-field"
												placeholder="https://yourportfolio.com"
												value={
													profileForm.portfolio_url
												}
												onChange={(e) =>
													setProfileForm({
														...profileForm,
														portfolio_url:
															e.target.value,
													})
												}
											/>
										</div>
									</div>

									{/* Profile Summary */}
									<div className="form-section">
										<h3 className="form-section-title">
											<FileTextIcon size={18} />
											About You
										</h3>
										<div className="form-group">
											<label htmlFor="profile_summary">
												Profile Summary
											</label>
											<textarea
												id="profile_summary"
												className="input-field"
												rows="4"
												placeholder="Tell us about yourself, your experience, and what you're looking for..."
												value={
													profileForm.profile_summary
												}
												onChange={(e) =>
													setProfileForm({
														...profileForm,
														profile_summary:
															e.target.value,
													})
												}
											/>
										</div>
									</div>
									{/* Job Search Status */}
									<div className="form-section">
										<h3 className="form-section-title">
											<Settings size={18} />
											Job Search Status
										</h3>
										<div className="form-group">
											<label htmlFor="status">
												Status *
											</label>
											<select
												id="status"
												className="input-field"
												value={profileForm.status}
												onChange={(e) =>
													setProfileForm({
														...profileForm,
														status: e.target.value,
													})
												}
												required
											>
												<option value="actively_looking">
													Actively Looking
												</option>
												<option value="casually_looking">
													Casually Looking
												</option>
												<option value="not_looking">
													Not Looking
												</option>
											</select>
										</div>
									</div>

									{/* Demographics (optional) */}
									<div className="form-section">
										<h3 className="form-section-title">
											<FileTextIcon size={18} />
											Demographics (optional)
										</h3>
										<p className="field-hint">
											Optional. Used for equal opportunity
											reporting and fairness analysis.
											This information is not shared with
											employers in a way that identifies
											you.
										</p>
										<div className="form-group">
											<label htmlFor="demographics_race_ethnicity">
												Race / Ethnicity
											</label>
											<input
												type="text"
												id="demographics_race_ethnicity"
												className="input-field"
												placeholder="Prefer not to say"
												value={
													profileForm.demographics_race_ethnicity
												}
												onChange={(e) =>
													setProfileForm({
														...profileForm,
														demographics_race_ethnicity:
															e.target.value,
													})
												}
											/>
										</div>

										<div className="form-group">
											<label htmlFor="demographics_gender">
												Gender
											</label>
											<input
												type="text"
												id="demographics_gender"
												className="input-field"
												placeholder="Prefer not to say"
												value={
													profileForm.demographics_gender
												}
												onChange={(e) =>
													setProfileForm({
														...profileForm,
														demographics_gender:
															e.target.value,
													})
												}
											/>
										</div>

										<div className="form-group">
											<label htmlFor="demographics_disability">
												Disability
											</label>
											<input
												type="text"
												id="demographics_disability"
												className="input-field"
												placeholder="Prefer not to say"
												value={
													profileForm.demographics_disability
												}
												onChange={(e) =>
													setProfileForm({
														...profileForm,
														demographics_disability:
															e.target.value,
													})
												}
											/>
										</div>
									</div>

									<div className="modal-actions">
										<button
											type="button"
											className="btn btn-outline"
											onClick={handleCloseModal}
											disabled={saving}
										>
											Cancel
										</button>
										<button
											type="submit"
											className="btn btn-primary"
											disabled={saving}
										>
											{saving
												? "Saving..."
												: "Save Changes"}
										</button>
									</div>
								</form>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default CandidateHome;
