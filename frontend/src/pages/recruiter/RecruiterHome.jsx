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
					<button className="btn btn-primary">
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
							<div className="stat-value">8</div>
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
							<div className="job-card">
								<div className="job-header">
									<div className="job-icon">👨‍💻</div>
									<div>
										<h3>Senior Frontend Developer</h3>
										<p>Posted 5 days ago • 23 applicants</p>
									</div>
								</div>
								<p className="job-description">
									Looking for an experienced React developer
									to join our team...
								</p>
								<div className="job-tags">
									<span className="tag">React</span>
									<span className="tag">TypeScript</span>
									<span className="tag">Remote</span>
								</div>
								<div className="job-actions">
									<button className="btn btn-outline btn-sm">
										View Applicants
									</button>
									<button className="btn btn-primary btn-sm">
										Edit Job
									</button>
								</div>
							</div>

							<div className="job-card">
								<div className="job-header">
									<div className="job-icon">🚀</div>
									<div>
										<h3>Full Stack Engineer</h3>
										<p>Posted 2 days ago • 31 applicants</p>
									</div>
								</div>
								<p className="job-description">
									Join our fast-growing team and help build
									innovative solutions...
								</p>
								<div className="job-tags">
									<span className="tag">Node.js</span>
									<span className="tag">React</span>
									<span className="tag">AWS</span>
								</div>
								<div className="job-actions">
									<button className="btn btn-outline btn-sm">
										View Applicants
									</button>
									<button className="btn btn-primary btn-sm">
										Edit Job
									</button>
								</div>
							</div>

							<div className="job-card">
								<div className="job-header">
									<div className="job-icon">📊</div>
									<div>
										<h3>Data Scientist</h3>
										<p>Posted 1 week ago • 18 applicants</p>
									</div>
								</div>
								<p className="job-description">
									Seeking a data scientist to help us make
									data-driven decisions...
								</p>
								<div className="job-tags">
									<span className="tag">Python</span>
									<span className="tag">ML</span>
									<span className="tag">SQL</span>
								</div>
								<div className="job-actions">
									<button className="btn btn-outline btn-sm">
										View Applicants
									</button>
									<button className="btn btn-primary btn-sm">
										Edit Job
									</button>
								</div>
							</div>
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
