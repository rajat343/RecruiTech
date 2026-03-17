import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { graphqlRequest } from "../../utils/graphql";
import {
	Users,
	Briefcase,
	Settings,
	PlusCircle,
	TrendingUp,
	Clock,
	X,
	User,
	Building2,
	FileText,
	ChevronLeft,
	ChevronDown,
	ChevronRight,
	CheckCircle,
	XCircle,
	Star,
	ExternalLink,
	BarChart3,
	AlertTriangle,
	Target,
} from "lucide-react";
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

const RecruiterHome = () => {
	const { user, loading: authLoading, token } = useAuth();
	const navigate = useNavigate();
	const [recruiter, setRecruiter] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [showProfileModal, setShowProfileModal] = useState(false);
	const [hasCreatedCompanies, setHasCreatedCompanies] = useState(false);
	const [editView, setEditView] = useState(null); // null, 'personal', 'company'
	const [personalForm, setPersonalForm] = useState({
		first_name: "",
		last_name: "",
		phone_number: "",
	});
	const [companyForm, setCompanyForm] = useState({
		name: "",
		domain: "",
	});
	const [saving, setSaving] = useState(false);
	const [editError, setEditError] = useState(null);
	const [jobs, setJobs] = useState([]);
	const [showJobModal, setShowJobModal] = useState(false);
	const [jobForm, setJobForm] = useState({
		title: "",
		description: "",
		employment_type: "full_time",
		experience_level: "mid",
		location_type: "onsite",
		location: "",
		salary_min: "",
		salary_max: "",
		salary_currency: "USD",
		skills: "",
		apply_url: "",
	});
	const [jobSaving, setJobSaving] = useState(false);
	const [jobError, setJobError] = useState(null);
	const [showApplicantsModal, setShowApplicantsModal] = useState(false);
	const [applicantsJob, setApplicantsJob] = useState(null);
	const [applicants, setApplicants] = useState([]);
	const [applicantsLoading, setApplicantsLoading] = useState(false);
	const [totalApplicants, setTotalApplicants] = useState(0);
	const [statusUpdating, setStatusUpdating] = useState(null);
	const [showAnalysisModal, setShowAnalysisModal] = useState(false);
	const [analysisData, setAnalysisData] = useState(null);
	const [analysisLoading, setAnalysisLoading] = useState(false);
	const [analysisCandidate, setAnalysisCandidate] = useState(null);
	const [analysisAppId, setAnalysisAppId] = useState(null);
	const [collapsedSections, setCollapsedSections] = useState({});
	const [evaluationScoresMap, setEvaluationScoresMap] = useState({});
	const [triggerLoading, setTriggerLoading] = useState(false);
	const [triggerSent, setTriggerSent] = useState(false);
	const [triggerError, setTriggerError] = useState(null);

	useEffect(() => {
		if (!authLoading && (!user || user.role !== "recruiter")) {
			navigate("/login");
			return;
		}

		const fetchProfile = async () => {
			if (!token) return;

			try {
				const data = await graphqlRequest(
					`
					query GetRecruiterProfile {
						myRecruiterProfile {
							id
							first_name
							last_name
							email
							phone_number
							company_id
						}
						companies(limit: 10) {
							id
							created_by
						}
						myJobPosts(limit: 20, offset: 0) {
							id
							title
							description
							employment_type
							experience_level
							location_type
							location
							salary_min
							salary_max
							salary_currency
							skills
							is_active
							application_count
							createdAt
						}
					}
					`,
					{},
					token
				);
				setRecruiter(data.myRecruiterProfile);

				// Check if recruiter has created any companies
				const createdCompanies = data.companies.filter(
					(company) => company.created_by === user.id
				);
				setHasCreatedCompanies(createdCompanies.length > 0);

				const jobsList = data.myJobPosts || [];
				setJobs(jobsList);
				const total = jobsList.reduce((sum, j) => sum + (j.application_count || 0), 0);
				setTotalApplicants(total);
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
		navigate("/recruiter/onboarding");
		return null;
	}

	const handleEditProfile = () => {
		if (hasCreatedCompanies) {
			// Show modal with options
			setShowProfileModal(true);
			setEditView(null);
		} else {
			// Directly show personal profile edit
			setPersonalForm({
				first_name: recruiter.first_name,
				last_name: recruiter.last_name,
				phone_number: recruiter.phone_number || "",
			});
			setEditView("personal");
			setShowProfileModal(true);
		}
	};

	const handleEditPersonalProfile = () => {
		setPersonalForm({
			first_name: recruiter.first_name,
			last_name: recruiter.last_name,
			phone_number: recruiter.phone_number || "",
		});
		setEditView("personal");
		setEditError(null);
	};

	const handleEditCompanyProfile = async () => {
		try {
			// Fetch company details
			const data = await graphqlRequest(
				`
				query GetCompany($id: ID!) {
					company(id: $id) {
						id
						name
						domain
					}
				}
				`,
				{ id: recruiter.company_id },
				token
			);
			setCompanyForm({
				name: data.company.name,
				domain: data.company.domain,
			});
			setEditView("company");
			setEditError(null);
		} catch (err) {
			console.error("Error fetching company:", err);
			setEditError(err.message || "Failed to load company details");
		}
	};

	const handleSavePersonal = async (e) => {
		e.preventDefault();
		setEditError(null);
		setSaving(true);

		try {
			await graphqlRequest(
				`
				mutation UpdateRecruiter($id: ID!, $input: RecruiterUpdateInput!) {
					updateRecruiter(id: $id, input: $input) {
						id
						first_name
						last_name
						phone_number
					}
				}
				`,
				{
					id: recruiter.id,
					input: {
						first_name: personalForm.first_name,
						last_name: personalForm.last_name,
						phone_number: personalForm.phone_number || null,
					},
				},
				token
			);

			// Update local state
			setRecruiter({
				...recruiter,
				first_name: personalForm.first_name,
				last_name: personalForm.last_name,
				phone_number: personalForm.phone_number,
			});

			// Close modal
			setShowProfileModal(false);
			setEditView(null);
		} catch (err) {
			console.error("Error updating profile:", err);
			setEditError(err.message || "Failed to update profile");
		} finally {
			setSaving(false);
		}
	};

	const handleSaveCompany = async (e) => {
		e.preventDefault();
		setEditError(null);
		setSaving(true);

		try {
			await graphqlRequest(
				`
				mutation UpdateCompany($id: ID!, $input: CompanyUpdateInput!) {
					updateCompany(id: $id, input: $input) {
						id
						name
						domain
					}
				}
				`,
				{
					id: recruiter.company_id,
					input: {
						name: companyForm.name,
						domain: companyForm.domain,
					},
				},
				token
			);

			// Close modal
			setShowProfileModal(false);
			setEditView(null);
		} catch (err) {
			console.error("Error updating company:", err);
			setEditError(err.message || "Failed to update company");
		} finally {
			setSaving(false);
		}
	};

	const handleCloseModal = () => {
		setShowProfileModal(false);
		setEditView(null);
		setEditError(null);
	};

	const handlePostNewJobClick = () => {
		// Ensure recruiter has a company before posting jobs
		if (!recruiter?.company_id || !hasCreatedCompanies) {
			navigate("/recruiter/onboarding");
			return;
		}

		setJobForm({
			title: "",
			description: "",
			employment_type: "full_time",
			experience_level: "mid",
			location_type: "onsite",
			location: "",
			salary_min: "",
			salary_max: "",
			salary_currency: "USD",
			skills: "",
			apply_url: "",
		});
		setJobError(null);
		setShowJobModal(true);
	};

	const handleCloseJobModal = () => {
		setShowJobModal(false);
		setJobError(null);
	};

	const handleCreateJob = async (e) => {
		e.preventDefault();
		setJobError(null);
		setJobSaving(true);

		try {
			const salaryMin = jobForm.salary_min
				? parseInt(jobForm.salary_min, 10)
				: null;
			const salaryMax = jobForm.salary_max
				? parseInt(jobForm.salary_max, 10)
				: null;

			if (
				Number.isFinite(salaryMin) &&
				Number.isFinite(salaryMax) &&
				salaryMin > salaryMax
			) {
				throw new Error(
					"Minimum salary cannot be greater than maximum salary."
				);
			}

			const skillsArray = jobForm.skills
				? jobForm.skills
						.split(",")
						.map((s) => s.trim())
						.filter(Boolean)
				: [];

			const variables = {
				input: {
					title: jobForm.title.trim(),
					description: jobForm.description.trim(),
					employment_type: jobForm.employment_type,
					experience_level: jobForm.experience_level,
					location_type: jobForm.location_type,
					location: jobForm.location.trim(),
					salary_min: Number.isFinite(salaryMin) ? salaryMin : null,
					salary_max: Number.isFinite(salaryMax) ? salaryMax : null,
					salary_currency: jobForm.salary_currency || null,
					skills: skillsArray.length ? skillsArray : null,
					apply_url: jobForm.apply_url || null,
				},
			};

			const data = await graphqlRequest(
				`
				mutation CreateJob($input: JobInput!) {
					createJob(input: $input) {
						id
						title
						description
						employment_type
						experience_level
						location_type
						location
						salary_min
						salary_max
						salary_currency
						skills
						is_active
						createdAt
					}
				}
				`,
				variables,
				token
			);

			const createdJob = data.createJob;
			setJobs((prev) => [createdJob, ...(prev || [])]);
			setShowJobModal(false);
		} catch (err) {
			console.error("Error creating job:", err);
			setJobError(err.message || "Failed to create job posting");
		} finally {
			setJobSaving(false);
		}
	};

	const handleViewApplicants = async (job) => {
		setApplicantsJob(job);
		setShowApplicantsModal(true);
		setApplicantsLoading(true);
		setApplicants([]);

		try {
			const data = await graphqlRequest(
				`
				query GetApplicants($job_id: ID!) {
					applicationsForJob(job_id: $job_id, limit: 50) {
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
				{ job_id: job.id },
				token
			);
			const apps = data.applicationsForJob || [];
			setApplicants(apps);

			// Fetch evaluation scores for all candidates
			const candidateIds = apps
				.map((a) => a.candidate?.id)
				.filter(Boolean);
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
						{ job_id: job.id, candidate_ids: candidateIds },
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
			console.error("Error fetching applicants:", err);
		} finally {
			setApplicantsLoading(false);
		}
	};

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
				prev.map((a) =>
					a.id === applicationId ? { ...a, status: newStatus } : a
				)
			);
		} catch (err) {
			console.error("Error updating status:", err);
		} finally {
			setStatusUpdating(null);
		}
	};

	const handleCloseApplicantsModal = () => {
		setShowApplicantsModal(false);
		setApplicantsJob(null);
	};

	const toggleSection = (key) => {
		setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
	};

	const handleShowAnalysis = async (app) => {
		setAnalysisCandidate(app.candidate);
		setAnalysisAppId(app.id);
		setAnalysisData(null);
		setAnalysisLoading(true);
		setShowApplicantsModal(false);
		setShowAnalysisModal(true);
		setCollapsedSections({ interview: true, ats_scorer: true, github_analyzer: true, leetcode_analyzer: true });
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
						agent_results {
							agent_name
							overall_score
							category_scores {
								category
								score
								weight
								evidence
							}
							strengths
							weaknesses
						}
						weight_profile {
							name
							reason
						}
						created_at
					}
				}
				`,
				{ candidate_id: app.candidate.id, job_id: applicantsJob.id },
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

	const handleBackToApplicants = () => {
		setShowAnalysisModal(false);
		setAnalysisData(null);
		setAnalysisCandidate(null);
		setAnalysisAppId(null);
		setShowApplicantsModal(true);
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
		setShowAnalysisModal(false);
		setAnalysisData(null);
		setAnalysisCandidate(null);
		setAnalysisAppId(null);
		setShowApplicantsModal(true);
	};

	const handleTriggerEvaluation = async () => {
		if (!analysisCandidate || !applicantsJob) return;
		setTriggerLoading(true);
		setTriggerError(null);
		try {
			await graphqlRequest(
				`
				mutation TriggerEval($candidate_id: String!, $job_id: String!) {
					triggerEvaluation(candidate_id: $candidate_id, job_id: $job_id)
				}
				`,
				{ candidate_id: analysisCandidate.id, job_id: applicantsJob.id },
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

	const getScoreColor = (score) => {
		if (score >= 75) return "#10b981";
		if (score >= 50) return "#f59e0b";
		return "#ef4444";
	};

	const getFitBadgeStyle = (fitLevel) => {
		const colors = {
			Strong: { bg: "rgba(16, 185, 129, 0.15)", color: "#10b981" },
			Moderate: { bg: "rgba(245, 158, 11, 0.15)", color: "#f59e0b" },
			Weak: { bg: "rgba(239, 68, 68, 0.15)", color: "#ef4444" },
		};
		return colors[fitLevel] || colors.Moderate;
	};

	const formatAgentName = (name) => {
		const names = {
			ats_scorer: "ATS Resume Score",
			github_analyzer: "GitHub Analysis",
			leetcode_analyzer: "LeetCode Analysis",
		};
		return names[name] || name;
	};

	return (
		<div className="dashboard-page">
			<div className="container">
				<div className="dashboard-header">
					<div>
						<h1>
							Welcome back, {recruiter?.first_name || "Recruiter"}
							! 👋
						</h1>
						<p>
							Manage your job postings and find the best
							candidates
						</p>
					</div>
					<button
						className="btn btn-primary"
						onClick={handlePostNewJobClick}
					>
						<PlusCircle size={20} />
						Post New Job
					</button>
				</div>

				<div className="stats-grid">
					<div className="stat-card">
						<div
							className="stat-icon"
							style={{ background: "rgba(34, 211, 238, 0.1)" }}
						>
							<Briefcase
								size={24}
								style={{ color: "var(--accent-cyan)" }}
							/>
						</div>
						<div className="stat-content">
							<div className="stat-value">{jobs.length}</div>
							<div className="stat-label">Active Jobs</div>
						</div>
					</div>

					<div className="stat-card">
						<div
							className="stat-icon"
							style={{ background: "rgba(16, 185, 129, 0.1)" }}
						>
							<Users size={24} style={{ color: "#10b981" }} />
						</div>
						<div className="stat-content">
							<div className="stat-value">{totalApplicants}</div>
							<div className="stat-label">Total Applicants</div>
						</div>
					</div>

					<div className="stat-card">
						<div
							className="stat-icon"
							style={{ background: "rgba(245, 158, 11, 0.1)" }}
						>
							<Clock size={24} style={{ color: "#f59e0b" }} />
						</div>
						<div className="stat-content">
							<div className="stat-value">15</div>
							<div className="stat-label">Pending Reviews</div>
						</div>
					</div>

					<div className="stat-card">
						<div
							className="stat-icon"
							style={{ background: "rgba(139, 92, 246, 0.1)" }}
						>
							<TrendingUp
								size={24}
								style={{ color: "#8b5cf6" }}
							/>
						</div>
						<div className="stat-content">
							<div className="stat-value">342</div>
							<div className="stat-label">Profile Views</div>
						</div>
					</div>
				</div>

				<div className="dashboard-content">
					<div className="dashboard-section">
						<h2>Active Job Postings</h2>
						<div className="job-list">
							{jobs.length === 0 ? (
								<div className="job-card">
									<div className="job-header">
										<div className="job-icon">💼</div>
										<div>
											<h3>No job postings yet</h3>
											<p>
												Start by publishing your first
												role to attract candidates.
											</p>
										</div>
									</div>
									<div className="job-actions">
										<button
											className="btn btn-primary btn-sm"
											onClick={handlePostNewJobClick}
										>
											<PlusCircle size={16} />
											Create Job Posting
										</button>
									</div>
								</div>
							) : (
								jobs.map((job) => (
									<div className="job-card" key={job.id}>
										<div className="job-header">
											<div className="job-icon">💼</div>
											<div>
												<h3>{job.title}</h3>
												<p>
													{job.employment_type
														.replace("_", " ")
														.replace(
															/\b\w/g,
															(c) =>
																c.toUpperCase()
														)}{" "}
													•{" "}
													{job.experience_level
														.charAt(0)
														.toUpperCase() +
														job.experience_level.slice(
															1
														)}{" "}
													•{" "}
													{job.location_type ===
													"remote"
														? "Remote"
														: job.location}
												</p>
											</div>
										</div>
										<p className="job-description">
											{job.description &&
											job.description.length > 220
												? `${job.description.slice(
														0,
														217
												  )}...`
												: job.description}
										</p>
										<div className="job-tags">
											{job.location_type && (
												<span className="tag">
													{job.location_type ===
													"remote"
														? "Remote"
														: job.location_type}
												</span>
											)}
											{job.experience_level && (
												<span className="tag">
													{job.experience_level
														.charAt(0)
														.toUpperCase() +
														job.experience_level.slice(
															1
														)}
												</span>
											)}
											{job.employment_type && (
												<span className="tag">
													{job.employment_type
														.replace("_", " ")
														.replace(
															/\b\w/g,
															(c) =>
																c.toUpperCase()
														)}
												</span>
											)}
											{Array.isArray(job.skills) &&
												job.skills
													.slice(0, 3)
													.map((skill) => (
														<span
															className="tag"
															key={`${job.id}-${skill}`}
														>
															{skill}
														</span>
													))}
										</div>
										<div className="job-actions">
											<span
												style={{
													color: "var(--text-secondary)",
													fontSize: "0.8rem",
													marginRight: "auto",
												}}
											>
												Posted{" "}
												{formatDate(job.createdAt)}
											</span>
											<button
												className="btn btn-outline btn-sm"
												onClick={() => handleViewApplicants(job)}
											>
												<Users size={14} />
												Applicants ({job.application_count || 0})
											</button>
										</div>
									</div>
								))
							)}
						</div>
					</div>

					<div className="dashboard-sidebar">
						<div className="profile-card card">
							<h3>Quick Actions</h3>
							<div className="action-buttons">
								<button
									className="btn btn-outline btn-full btn-sm"
									onClick={handleEditProfile}
								>
									<Settings size={16} />
									Edit Profile
								</button>
								<button className="btn btn-outline btn-full btn-sm">
									<Users size={16} />
									Search Candidates
								</button>
								<button className="btn btn-outline btn-full btn-sm">
									<Briefcase size={16} />
									Manage Jobs
								</button>
							</div>
						</div>

						<div className="tips-card card">
							<h3>Hiring Tips</h3>
							<ul className="tips-list">
								<li>✨ Write clear job descriptions</li>
								<li>
									📝 Respond to applicants within 48 hours
								</li>
								<li>
									🎯 Use AI matching for better candidates
								</li>
								<li>💬 Set up video screening</li>
							</ul>
						</div>

						<div className="tips-card card">
							<h3>Recent Activity</h3>
							<ul className="tips-list">
								<li>🔔 5 new applications today</li>
								<li>👀 12 candidates viewed your jobs</li>
								<li>✅ 2 interviews scheduled</li>
								<li>📧 3 unread messages</li>
							</ul>
						</div>
					</div>
				</div>

				{/* New Job Posting Modal */}
				{showJobModal && (
					<div className="modal-overlay" onClick={handleCloseJobModal}>
						<div
							className="modal-content modal-large"
							onClick={(e) => e.stopPropagation()}
						>
							<div className="modal-header">
								<h2>Create Job Posting</h2>
								<button
									className="modal-close"
									onClick={handleCloseJobModal}
								>
									<X size={24} />
								</button>
							</div>
							<div className="modal-body">
								{jobError && (
									<div className="alert alert-error">
										{jobError}
									</div>
								)}

								<form onSubmit={handleCreateJob}>
									<div className="form-section">
										<div className="form-section-title">
											<Briefcase size={18} />
											<span>Role details</span>
										</div>
										<div className="form-group">
											<label htmlFor="job_title">
												Job Title *
											</label>
											<input
												type="text"
												id="job_title"
												className="input-field"
												placeholder="e.g. Senior Frontend Engineer"
												value={jobForm.title}
												onChange={(e) =>
													setJobForm({
														...jobForm,
														title: e.target.value,
													})
												}
												required
											/>
										</div>
										<div className="form-group">
											<label htmlFor="job_description">
												Job Description *
											</label>
											<textarea
												id="job_description"
												className="input-field"
												placeholder="Describe the role, key responsibilities, and what success looks like in the first 6–12 months."
												value={jobForm.description}
												onChange={(e) =>
													setJobForm({
														...jobForm,
														description:
															e.target.value,
													})
												}
												required
											/>
										</div>
									</div>

									<div className="form-section">
										<div className="form-section-title">
											<Users size={18} />
											<span>Location & type</span>
										</div>
										<div className="form-row">
											<div className="form-group">
												<label htmlFor="employment_type">
													Employment Type *
												</label>
												<select
													id="employment_type"
													className="input-field"
													value={
														jobForm.employment_type
													}
													onChange={(e) =>
														setJobForm({
															...jobForm,
															employment_type:
																e.target.value,
														})
													}
													required
												>
													<option value="full_time">
														Full-time
													</option>
													<option value="part_time">
														Part-time
													</option>
													<option value="contract">
														Contract
													</option>
													<option value="internship">
														Internship
													</option>
													<option value="freelance">
														Freelance
													</option>
												</select>
											</div>
											<div className="form-group">
												<label htmlFor="experience_level">
													Experience Level *
												</label>
												<select
													id="experience_level"
													className="input-field"
													value={
														jobForm.experience_level
													}
													onChange={(e) =>
														setJobForm({
															...jobForm,
															experience_level:
																e.target.value,
														})
													}
													required
												>
													<option value="junior">
														Junior
													</option>
													<option value="mid">
														Mid
													</option>
													<option value="senior">
														Senior
													</option>
													<option value="lead">
														Lead
													</option>
												</select>
											</div>
										</div>
										<div className="form-row">
											<div className="form-group">
												<label htmlFor="location_type">
													Work Arrangement *
												</label>
												<select
													id="location_type"
													className="input-field"
													value={jobForm.location_type}
													onChange={(e) =>
														setJobForm({
															...jobForm,
															location_type:
																e.target.value,
														})
													}
													required
												>
													<option value="onsite">
														Onsite
													</option>
													<option value="remote">
														Remote
													</option>
													<option value="hybrid">
														Hybrid
													</option>
												</select>
											</div>
											<div className="form-group">
												<label htmlFor="location">
													Location *
												</label>
												<input
													type="text"
													id="location"
													className="input-field"
													placeholder="e.g. Bengaluru, India or Remote"
													value={jobForm.location}
													onChange={(e) =>
														setJobForm({
															...jobForm,
															location:
																e.target.value,
														})
													}
													required
												/>
											</div>
										</div>
									</div>

									<div className="form-section">
										<div className="form-section-title">
											<TrendingUp size={18} />
											<span>Compensation & skills</span>
										</div>
										<div className="form-row">
											<div className="form-group">
												<label htmlFor="salary_min">
													Min Salary
												</label>
												<input
													type="number"
													id="salary_min"
													className="input-field"
													min="0"
													value={jobForm.salary_min}
													onChange={(e) =>
														setJobForm({
															...jobForm,
															salary_min:
																e.target.value,
														})
													}
												/>
											</div>
											<div className="form-group">
												<label htmlFor="salary_max">
													Max Salary
												</label>
												<input
													type="number"
													id="salary_max"
													className="input-field"
													min="0"
													value={jobForm.salary_max}
													onChange={(e) =>
														setJobForm({
															...jobForm,
															salary_max:
																e.target.value,
														})
													}
												/>
											</div>
										</div>
										<div className="form-row">
											<div className="form-group">
												<label htmlFor="salary_currency">
													Currency
												</label>
												<select
													id="salary_currency"
													className="input-field"
													value={
														jobForm.salary_currency
													}
													onChange={(e) =>
														setJobForm({
															...jobForm,
															salary_currency:
																e.target.value,
														})
													}
												>
													<option value="USD">
														USD
													</option>
													<option value="INR">
														INR
													</option>
													<option value="EUR">
														EUR
													</option>
													<option value="GBP">
														GBP
													</option>
												</select>
											</div>
											<div className="form-group">
												<label htmlFor="skills">
													Key Skills (comma-separated)
												</label>
												<input
													type="text"
													id="skills"
													className="input-field"
													placeholder="e.g. React, TypeScript, GraphQL"
													value={jobForm.skills}
													onChange={(e) =>
														setJobForm({
															...jobForm,
															skills:
																e.target.value,
														})
													}
												/>
											</div>
										</div>
										<div className="form-group">
											<label htmlFor="apply_url">
												Application URL (optional)
											</label>
											<input
												type="url"
												id="apply_url"
												className="input-field"
												placeholder="https://your-careers-page.com/job/123"
												value={jobForm.apply_url}
												onChange={(e) =>
													setJobForm({
														...jobForm,
														apply_url:
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
											onClick={handleCloseJobModal}
											disabled={jobSaving}
										>
											Cancel
										</button>
										<button
											type="submit"
											className="btn btn-primary"
											disabled={jobSaving}
										>
											{jobSaving
												? "Publishing..."
												: "Publish Job"}
										</button>
									</div>
								</form>
							</div>
						</div>
					</div>
				)}

				{/* Profile Edit Modal */}
				{showProfileModal && (
					<div className="modal-overlay" onClick={handleCloseModal}>
						<div
							className="modal-content"
							onClick={(e) => e.stopPropagation()}
						>
							<div className="modal-header">
								<h2>
									{editView === "personal"
										? "Edit Personal Profile"
										: editView === "company"
										? "Edit Company Profile"
										: "Edit Profile"}
								</h2>
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

								{/* Choose Option View */}
								{!editView && (
									<>
										<p
											style={{
												marginBottom: "1.5rem",
												color: "var(--text-secondary)",
											}}
										>
											Choose what you'd like to edit:
										</p>
										<div className="profile-options">
											<button
												className="profile-option-card"
												onClick={
													handleEditPersonalProfile
												}
											>
												<div className="profile-option-icon">
													<User size={32} />
												</div>
												<h3>Personal Profile</h3>
												<p>
													Edit your name, phone
													number, and other personal
													details
												</p>
											</button>
											<button
												className="profile-option-card"
												onClick={
													handleEditCompanyProfile
												}
											>
												<div className="profile-option-icon">
													<Building2 size={32} />
												</div>
												<h3>Company Profile</h3>
												<p>
													Edit company name and domain
												</p>
											</button>
										</div>
									</>
								)}

								{/* Personal Profile Edit Form */}
								{editView === "personal" && (
									<form onSubmit={handleSavePersonal}>
										<div className="form-group">
											<label htmlFor="first_name">
												First Name *
											</label>
											<input
												type="text"
												id="first_name"
												className="input-field"
												value={personalForm.first_name}
												onChange={(e) =>
													setPersonalForm({
														...personalForm,
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
												value={personalForm.last_name}
												onChange={(e) =>
													setPersonalForm({
														...personalForm,
														last_name:
															e.target.value,
													})
												}
												required
											/>
										</div>

										<div className="form-group">
											<label htmlFor="phone_number">
												Phone Number
											</label>
											<input
												type="tel"
												id="phone_number"
												className="input-field"
												placeholder="+1 (555) 123-4567"
												value={
													personalForm.phone_number
												}
												onChange={(e) =>
													setPersonalForm({
														...personalForm,
														phone_number:
															e.target.value,
													})
												}
											/>
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
								)}

								{/* Company Profile Edit Form */}
								{editView === "company" && (
									<form onSubmit={handleSaveCompany}>
										<div className="form-group">
											<label htmlFor="company_name">
												Company Name *
											</label>
											<input
												type="text"
												id="company_name"
												className="input-field"
												value={companyForm.name}
												onChange={(e) =>
													setCompanyForm({
														...companyForm,
														name: e.target.value,
													})
												}
												required
											/>
										</div>

										<div className="form-group">
											<label htmlFor="company_domain">
												Domain *
											</label>
											<input
												type="text"
												id="company_domain"
												className="input-field"
												placeholder="example.com"
												value={companyForm.domain}
												onChange={(e) =>
													setCompanyForm({
														...companyForm,
														domain: e.target.value,
													})
												}
												required
											/>
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
								)}
							</div>
						</div>
					</div>
				)}

				{/* AI Analysis Report Modal */}
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
										onClick={handleBackToApplicants}
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
									<div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", fontSize: "1rem" }}>
										{/* Overall Score + Fit Level + Actions */}
										<div style={{
											display: "flex", alignItems: "center", gap: "1.5rem",
											background: "var(--bg-dark)", border: "1px solid var(--border)",
											borderRadius: "0.75rem", padding: "1.5rem",
										}}>
											<div style={{
												width: "90px", height: "90px", borderRadius: "50%",
												border: `4px solid ${getScoreColor(analysisData.final_score)}`,
												display: "flex", alignItems: "center", justifyContent: "center",
												flexShrink: 0,
											}}>
												<span style={{ fontSize: "1.75rem", fontWeight: 700, color: getScoreColor(analysisData.final_score) }}>
													{Math.round(analysisData.final_score)}
												</span>
											</div>
											<div style={{ flex: 1 }}>
												<div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
													<h3 style={{ margin: 0, fontSize: "1.35rem" }}>Overall Score</h3>
													<span style={{
														padding: "0.25rem 0.85rem", borderRadius: "1rem",
														fontSize: "0.95rem", fontWeight: 600,
														background: getFitBadgeStyle(analysisData.fit_level).bg,
														color: getFitBadgeStyle(analysisData.fit_level).color,
													}}>
														{analysisData.fit_level} Fit
													</span>
												</div>
												{analysisData.weight_profile && (
													<p style={{ margin: 0, fontSize: "0.95rem", color: "var(--text-secondary)" }}>
														{analysisData.weight_profile.name} — {analysisData.weight_profile.reason}
													</p>
												)}
											</div>
											<div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
												<button
													className="btn btn-sm"
													style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.3)", padding: "0.5rem 1rem", fontSize: "0.9rem" }}
													onClick={() => handleAnalysisAction("accept")}
													disabled={statusUpdating === analysisAppId}
												>
													<Star size={15} />
													Shortlist
												</button>
												<button
													className="btn btn-sm"
													style={{ background: "rgba(239, 68, 68, 0.15)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.3)", padding: "0.5rem 1rem", fontSize: "0.9rem" }}
													onClick={() => handleAnalysisAction("reject")}
													disabled={statusUpdating === analysisAppId}
												>
													<XCircle size={15} />
													Reject
												</button>
											</div>
										</div>

										{/* Summary — always visible */}
										{analysisData.summary && (
											<div style={{
												background: "var(--bg-dark)", border: "1px solid var(--border)",
												borderRadius: "0.75rem", padding: "1.25rem",
											}}>
												<h4 style={{ margin: "0 0 0.6rem 0", fontSize: "1.1rem" }}>Summary</h4>
												<p style={{ margin: 0, fontSize: "1rem", lineHeight: 1.7, color: "var(--text-secondary)" }}>
													{analysisData.summary}
												</p>
											</div>
										)}

										{/* Top Strengths & Key Concerns — always visible */}
										<div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
											{analysisData.top_strengths && analysisData.top_strengths.length > 0 && (
												<div style={{
													flex: 1, minWidth: "260px",
													background: "var(--bg-dark)", border: "1px solid var(--border)",
													borderRadius: "0.75rem", padding: "1.25rem",
												}}>
													<h4 style={{ margin: "0 0 0.6rem 0", fontSize: "1.05rem", color: "#10b981", display: "flex", alignItems: "center", gap: "0.5rem" }}>
														<CheckCircle size={18} /> Top Strengths
													</h4>
													{analysisData.top_strengths.map((s, i) => (
														<p key={i} style={{ fontSize: "0.95rem", color: "var(--text-secondary)", margin: "0 0 0.4rem 0", lineHeight: 1.5 }}>
															{s}
														</p>
													))}
												</div>
											)}
											{analysisData.key_concerns && analysisData.key_concerns.length > 0 && (
												<div style={{
													flex: 1, minWidth: "260px",
													background: "var(--bg-dark)", border: "1px solid var(--border)",
													borderRadius: "0.75rem", padding: "1.25rem",
												}}>
													<h4 style={{ margin: "0 0 0.6rem 0", fontSize: "1.05rem", color: "#ef4444", display: "flex", alignItems: "center", gap: "0.5rem" }}>
														<AlertTriangle size={18} /> Key Concerns
													</h4>
													{analysisData.key_concerns.map((c, i) => (
														<p key={i} style={{ fontSize: "0.95rem", color: "var(--text-secondary)", margin: "0 0 0.4rem 0", lineHeight: 1.5 }}>
															{c}
														</p>
													))}
												</div>
											)}
										</div>

										{/* Interview Focus Areas — collapsible */}
										{analysisData.interview_focus_areas && analysisData.interview_focus_areas.length > 0 && (
											<div style={{
												background: "var(--bg-dark)", border: "1px solid var(--border)",
												borderRadius: "0.75rem", overflow: "hidden",
											}}>
												<button
													onClick={() => toggleSection("interview")}
													style={{
														width: "100%", padding: "1rem 1.25rem", background: "none", border: "none",
														cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between",
														color: "var(--text-primary)",
													}}
												>
													<h4 style={{ margin: 0, fontSize: "1.05rem", color: "#8b5cf6", display: "flex", alignItems: "center", gap: "0.5rem" }}>
														<Target size={18} /> Interview Focus Areas
													</h4>
													{collapsedSections.interview ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
												</button>
												{!collapsedSections.interview && (
													<div style={{ padding: "0 1.25rem 1.25rem" }}>
														{analysisData.interview_focus_areas.map((area, i) => (
															<p key={i} style={{ fontSize: "0.95rem", color: "var(--text-secondary)", margin: "0 0 0.4rem 0", lineHeight: 1.5 }}>
																{area}
															</p>
														))}
													</div>
												)}
											</div>
										)}

										{/* Agent Breakdowns — collapsible */}
										{analysisData.agent_results && analysisData.agent_results.length > 0 && (
											<div>
												{analysisData.agent_results.map((agent) => (
													<div
														key={agent.agent_name}
														style={{
															background: "var(--bg-dark)", border: "1px solid var(--border)",
															borderRadius: "0.75rem", marginBottom: "0.75rem", overflow: "hidden",
														}}
													>
														<button
															onClick={() => toggleSection(agent.agent_name)}
															style={{
																width: "100%", padding: "1rem 1.25rem", background: "none", border: "none",
																cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between",
																color: "var(--text-primary)",
															}}
														>
															<h5 style={{ margin: 0, fontSize: "1.05rem" }}>{formatAgentName(agent.agent_name)}</h5>
															<div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
																<span style={{
																	fontSize: "1.1rem", fontWeight: 700,
																	color: getScoreColor(agent.overall_score),
																}}>
																	{Math.round(agent.overall_score)}/100
																</span>
																{collapsedSections[agent.agent_name] ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
															</div>
														</button>
														{!collapsedSections[agent.agent_name] && (
															<div style={{ padding: "0 1.25rem 1.25rem" }}>
																{/* Category score bars */}
																{agent.category_scores && agent.category_scores.map((cat) => (
																	<div key={cat.category} style={{ marginBottom: "0.6rem" }}>
																		<div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.95rem", marginBottom: "0.3rem" }}>
																			<span style={{ color: "var(--text-secondary)", textTransform: "capitalize" }}>
																				{cat.category.replace(/_/g, " ")}
																			</span>
																			<span style={{ color: getScoreColor(cat.score), fontWeight: 600 }}>
																				{Math.round(cat.score)}
																			</span>
																		</div>
																		<div style={{
																			height: "7px", borderRadius: "3.5px",
																			background: "rgba(255,255,255,0.08)", overflow: "hidden",
																		}}>
																			<div style={{
																				height: "100%", borderRadius: "3.5px",
																				width: `${Math.min(100, cat.score)}%`,
																				background: getScoreColor(cat.score),
																				transition: "width 0.5s ease",
																			}} />
																		</div>
																	</div>
																))}

																{/* Strengths & Weaknesses */}
																<div style={{ display: "flex", gap: "1.25rem", marginTop: "1rem", flexWrap: "wrap" }}>
																	{agent.strengths && agent.strengths.length > 0 && (
																		<div style={{ flex: 1, minWidth: "220px" }}>
																			<p style={{ fontSize: "0.9rem", fontWeight: 600, color: "#10b981", margin: "0 0 0.4rem 0" }}>Strengths</p>
																			{agent.strengths.map((s, i) => (
																				<p key={i} style={{ fontSize: "0.95rem", color: "var(--text-secondary)", margin: "0 0 0.3rem 0", lineHeight: 1.5 }}>
																					<CheckCircle size={14} style={{ color: "#10b981", marginRight: "0.4rem", verticalAlign: "middle" }} />
																					{s}
																				</p>
																			))}
																		</div>
																	)}
																	{agent.weaknesses && agent.weaknesses.length > 0 && (
																		<div style={{ flex: 1, minWidth: "220px" }}>
																			<p style={{ fontSize: "0.9rem", fontWeight: 600, color: "#ef4444", margin: "0 0 0.4rem 0" }}>Weaknesses</p>
																			{agent.weaknesses.map((w, i) => (
																				<p key={i} style={{ fontSize: "0.95rem", color: "var(--text-secondary)", margin: "0 0 0.3rem 0", lineHeight: 1.5 }}>
																					<XCircle size={14} style={{ color: "#ef4444", marginRight: "0.4rem", verticalAlign: "middle" }} />
																					{w}
																				</p>
																			))}
																		</div>
																	)}
																</div>
															</div>
														)}
													</div>
												))}
											</div>
										)}

										{/* Action Buttons */}
										<div style={{
											display: "flex", gap: "0.75rem", justifyContent: "flex-end",
											paddingTop: "0.75rem", borderTop: "1px solid var(--border)",
										}}>
											<button
												className="btn btn-sm"
												style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.3)", padding: "0.5rem 1.25rem", fontSize: "0.95rem" }}
												onClick={() => handleAnalysisAction("accept")}
												disabled={statusUpdating === analysisAppId}
											>
												<Star size={16} />
												Shortlist
											</button>
											<button
												className="btn btn-sm"
												style={{ background: "rgba(239, 68, 68, 0.15)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.3)", padding: "0.5rem 1.25rem", fontSize: "0.95rem" }}
												onClick={() => handleAnalysisAction("reject")}
												disabled={statusUpdating === analysisAppId}
											>
												<XCircle size={16} />
												Reject
											</button>
										</div>
									</div>
								)}
							</div>
						</div>
					</div>
				)}

				{/* Applicants Modal */}
				{showApplicantsModal && applicantsJob && (
					<div className="modal-overlay" onClick={handleCloseApplicantsModal}>
						<div
							className="modal-content modal-large"
							onClick={(e) => e.stopPropagation()}
						>
							<div className="modal-header">
								<h2>Applicants for {applicantsJob.title}</h2>
								<button
									className="modal-close"
									onClick={handleCloseApplicantsModal}
								>
									<X size={24} />
								</button>
							</div>
							<div className="modal-body">
								{applicantsLoading ? (
									<div className="loading-spinner" style={{ minHeight: "200px" }}>
										<div className="spinner"></div>
										<p>Loading applicants...</p>
									</div>
								) : applicants.length === 0 ? (
									<div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-secondary)" }}>
										<Users size={48} style={{ opacity: 0.4, marginBottom: "1rem" }} />
										<h3 style={{ color: "var(--text-primary)" }}>No applicants yet</h3>
										<p>Applicants will appear here once candidates apply to this job.</p>
									</div>
								) : (
									<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
										{applicants.map((app) => (
											<div
												key={app.id}
												style={{
													background: "var(--bg-dark)",
													border: "1px solid var(--border)",
													borderRadius: "0.75rem",
													padding: "1.25rem",
												}}
											>
												<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
													<div>
														<h3 style={{ margin: "0 0 0.25rem 0", color: "var(--text-primary)", fontSize: "1.05rem" }}>
															{app.candidate?.first_name} {app.candidate?.last_name}
														</h3>
														<p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
															{app.candidate?.email}
															{app.candidate?.location_city && ` \u2022 ${app.candidate.location_city}${app.candidate.location_state ? `, ${app.candidate.location_state}` : ""}`}
														</p>
													</div>
													<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
													{evaluationScoresMap[app.candidate?.id] && (
														<span
															style={{
																padding: "0.25rem 0.65rem",
																borderRadius: "1rem",
																fontSize: "0.75rem",
																fontWeight: 700,
																background: `${getScoreColor(evaluationScoresMap[app.candidate.id].final_score)}22`,
																color: getScoreColor(evaluationScoresMap[app.candidate.id].final_score),
																display: "flex",
																alignItems: "center",
																gap: "0.3rem",
															}}
														>
															<BarChart3 size={12} />
															{Math.round(evaluationScoresMap[app.candidate.id].final_score)}/100
														</span>
													)}
													<span
														style={{
															padding: "0.25rem 0.75rem",
															borderRadius: "1rem",
															fontSize: "0.75rem",
															fontWeight: 600,
															background:
																app.status === "shortlisted" ? "rgba(16, 185, 129, 0.15)" :
																app.status === "rejected" ? "rgba(239, 68, 68, 0.15)" :
																app.status === "hired" ? "rgba(34, 211, 238, 0.15)" :
																app.status === "reviewed" ? "rgba(139, 92, 246, 0.15)" :
																"rgba(245, 158, 11, 0.15)",
															color:
																app.status === "shortlisted" ? "#10b981" :
																app.status === "rejected" ? "#ef4444" :
																app.status === "hired" ? "var(--accent-cyan)" :
																app.status === "reviewed" ? "#8b5cf6" :
																"#f59e0b",
														}}
													>
														{app.status.charAt(0).toUpperCase() + app.status.slice(1)}
													</span>
												</div>
												</div>

												{app.candidate?.skills && app.candidate.skills.length > 0 && (
													<div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.75rem" }}>
														{app.candidate.skills.slice(0, 6).map((skill) => (
															<span className="tag" key={`${app.id}-${skill}`}>{skill}</span>
														))}
													</div>
												)}

												{app.cover_letter && (
													<p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.75rem", lineHeight: 1.5 }}>
														<strong style={{ color: "var(--text-primary)" }}>Cover Letter:</strong>{" "}
														{app.cover_letter.length > 200 ? `${app.cover_letter.slice(0, 197)}...` : app.cover_letter}
													</p>
												)}

												<div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
													{app.resume_url && (
														<a
															href={app.resume_url}
															target="_blank"
															rel="noopener noreferrer"
															className="btn btn-outline btn-sm"
															style={{ textDecoration: "none" }}
														>
															<FileText size={14} />
															Resume
														</a>
													)}
													{app.candidate?.linkedin_url && (
														<a
															href={app.candidate.linkedin_url}
															target="_blank"
															rel="noopener noreferrer"
															className="btn btn-outline btn-sm"
															style={{ textDecoration: "none" }}
														>
															<ExternalLink size={14} />
															LinkedIn
														</a>
													)}
													{app.candidate?.github_url && (
														<a
															href={app.candidate.github_url}
															target="_blank"
															rel="noopener noreferrer"
															className="btn btn-outline btn-sm"
															style={{ textDecoration: "none" }}
														>
															<ExternalLink size={14} />
															GitHub
														</a>
													)}

													<div style={{ marginLeft: "auto", display: "flex", gap: "0.4rem" }}>
														<button
															className="btn btn-sm"
															style={{ background: "rgba(139, 92, 246, 0.15)", color: "#8b5cf6", border: "1px solid rgba(139, 92, 246, 0.3)" }}
															onClick={() => handleShowAnalysis(app)}
														>
															<BarChart3 size={14} />
															AI Analysis
														</button>
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
											</div>
										))}
									</div>
								)}
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default RecruiterHome;
