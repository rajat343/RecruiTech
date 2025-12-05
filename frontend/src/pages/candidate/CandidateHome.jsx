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
} from "lucide-react";
import "./CandidateHome.css";

const CandidateHome = () => {
	const { user, loading: authLoading, token } = useAuth();
	const navigate = useNavigate();
	const [candidate, setCandidate] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

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
							status
							resume_url
							github_url
							portfolio_url
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
					<button className="btn btn-primary">
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
								<div className="profile-stat-item">
									<span className="label">Completion:</span>
									<span className="value">85%</span>
								</div>
							</div>
							<button className="btn btn-outline btn-full btn-sm">
								Complete Profile
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
			</div>
		</div>
	);
};

export default CandidateHome;
