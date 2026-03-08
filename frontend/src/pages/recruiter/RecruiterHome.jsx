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

				setJobs(data.myJobPosts || []);
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
							<div className="stat-value">127</div>
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
											<button className="btn btn-outline btn-sm">
												View Applicants
											</button>
											<button className="btn btn-primary btn-sm">
												Edit Job
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
			</div>
		</div>
	);
};

export default RecruiterHome;
