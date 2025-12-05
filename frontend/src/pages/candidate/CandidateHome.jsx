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
		first_name: "",
		last_name: "",
		phone_number: "",
		resume_url: "",
		github_url: "",
		leetcode_url: "",
		portfolio_url: "",
		profile_summary: "",
		status: "actively_looking",
	});
	const [saving, setSaving] = useState(false);
	const [editError, setEditError] = useState(null);

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
					query GetCandidateProfile {
						myCandidateProfile {
							id
							first_name
							last_name
							email
							phone_number
							status
							resume_url
							github_url
							leetcode_url
							portfolio_url
							profile_summary
						}
					}
					`,
					{},
					token
				);
				setCandidate(data.myCandidateProfile);
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
			resume_url: candidate.resume_url || "",
			github_url: candidate.github_url || "",
			leetcode_url: candidate.leetcode_url || "",
			portfolio_url: candidate.portfolio_url || "",
			profile_summary: candidate.profile_summary || "",
			status: candidate.status,
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
						resume_url
						github_url
						leetcode_url
						portfolio_url
						profile_summary
						status
					}
				}
				`,
				{
					id: candidate.id,
					input: {
						first_name: profileForm.first_name,
						last_name: profileForm.last_name,
						phone_number: profileForm.phone_number || null,
						resume_url: profileForm.resume_url || null,
						github_url: profileForm.github_url || null,
						leetcode_url: profileForm.leetcode_url || null,
						portfolio_url: profileForm.portfolio_url || null,
						profile_summary: profileForm.profile_summary || null,
						status: profileForm.status,
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
							<div className="stat-value">12</div>
							<div className="stat-label">Applications</div>
						</div>
					</div>

					<div className="stat-card">
						<div
							className="stat-icon"
							style={{ background: "rgba(16, 185, 129, 0.1)" }}
						>
							<CheckCircle
								size={24}
								style={{ color: "#10b981" }}
							/>
						</div>
						<div className="stat-content">
							<div className="stat-value">5</div>
							<div className="stat-label">Interviews</div>
						</div>
					</div>

					<div className="stat-card">
						<div
							className="stat-icon"
							style={{ background: "rgba(245, 158, 11, 0.1)" }}
						>
							<TrendingUp
								size={24}
								style={{ color: "#f59e0b" }}
							/>
						</div>
						<div className="stat-content">
							<div className="stat-value">23</div>
							<div className="stat-label">Profile Views</div>
						</div>
					</div>

					<div className="stat-card">
						<div
							className="stat-icon"
							style={{ background: "rgba(139, 92, 246, 0.1)" }}
						>
							<FileText size={24} style={{ color: "#8b5cf6" }} />
						</div>
						<div className="stat-content">
							<div className="stat-value">8</div>
							<div className="stat-label">Job Matches</div>
						</div>
					</div>
				</div>

				<div className="dashboard-content">
					<div className="dashboard-section">
						<h2>Recommended Jobs</h2>
						<div className="job-list">
							<div className="job-card">
								<div className="job-header">
									<div className="job-icon">👨‍💻</div>
									<div>
										<h3>Senior Frontend Developer</h3>
										<p>Tech Corp • San Francisco, CA</p>
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
								<button className="btn btn-primary btn-sm">
									Apply Now
								</button>
							</div>

							<div className="job-card">
								<div className="job-header">
									<div className="job-icon">🚀</div>
									<div>
										<h3>Full Stack Engineer</h3>
										<p>Startup Inc • New York, NY</p>
									</div>
								</div>
								<p className="job-description">
									Join our fast-growing startup and help build
									the future...
								</p>
								<div className="job-tags">
									<span className="tag">Node.js</span>
									<span className="tag">React</span>
									<span className="tag">AWS</span>
								</div>
								<button className="btn btn-primary btn-sm">
									Apply Now
								</button>
							</div>
						</div>
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

						<div className="tips-card card">
							<h3>Quick Tips</h3>
							<ul className="tips-list">
								<li>✨ Update your skills regularly</li>
								<li>📝 Keep your resume current</li>
								<li>🎯 Set job alerts for your preferences</li>
								<li>💬 Respond to messages quickly</li>
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
									</div>

									{/* Links & URLs */}
									<div className="form-section">
										<h3 className="form-section-title">
											<Link size={18} />
											Links & URLs
										</h3>
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
