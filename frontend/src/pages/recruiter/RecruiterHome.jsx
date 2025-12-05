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
} from "lucide-react";
import "../candidate/CandidateHome.css";

const RecruiterHome = () => {
	const { user, loading: authLoading, token } = useAuth();
	const navigate = useNavigate();
	const [recruiter, setRecruiter] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

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
					}
					`,
					{},
					token
				);
				setRecruiter(data.myRecruiterProfile);
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
								<button className="btn btn-outline btn-full btn-sm">
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
			</div>
		</div>
	);
};

export default RecruiterHome;
