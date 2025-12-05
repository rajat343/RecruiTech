import { Link } from "react-router-dom";
import {
	Users,
	Briefcase,
	Sparkles,
	Video,
	FolderGit2,
	Zap,
	Shield,
	BarChart3,
} from "lucide-react";
import "./Landing.css";

const Landing = () => {
	return (
		<div className="landing">
			{/* Hero Section */}
			<section className="hero">
				<div className="container">
					<div className="hero-badge">
						<Sparkles size={16} />
						<span>AI-Powered Recruitment Platform</span>
					</div>

					<h1 className="hero-title">
						Where Technology
						<br />
						<span className="text-gradient">Meets Talent</span>
					</h1>

					<p className="hero-description">
						RecruiTech revolutionizes hiring with intelligent
						matching, automated screening, and seamless candidate
						experiences. Find your perfect fit faster.
					</p>

					<div className="hero-actions">
						<Link to="/signup" className="btn btn-primary btn-lg">
							Get Started Free
							<span>→</span>
						</Link>
						<Link
							to="/for-employers"
							className="btn btn-secondary btn-lg"
						>
							For Employers
						</Link>
					</div>

					<div className="hero-stats">
						<div className="stat-item">
							<Users size={24} className="stat-icon" />
							<div>
								<div className="stat-value">50K+</div>
								<div className="stat-label">
									Active Candidates
								</div>
							</div>
						</div>
						<div className="stat-item">
							<Briefcase size={24} className="stat-icon" />
							<div>
								<div className="stat-value">10K+</div>
								<div className="stat-label">Jobs Posted</div>
							</div>
						</div>
						<div className="stat-item">
							<Sparkles size={24} className="stat-icon" />
							<div>
								<div className="stat-value">95%</div>
								<div className="stat-label">Match Accuracy</div>
							</div>
						</div>
					</div>
				</div>

				{/* Wave Divider */}
				<div className="wave-divider">
					<svg
						viewBox="0 0 1440 120"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							d="M0,64L80,69.3C160,75,320,85,480,80C640,75,800,53,960,48C1120,43,1280,53,1360,58.7L1440,64L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z"
							fill="#f8fafc"
						/>
					</svg>
				</div>
			</section>

			{/* Features Section */}
			<section className="features">
				<div className="container">
					<h2 className="section-title">
						Powerful Features for Modern Recruitment
					</h2>
					<p className="section-description">
						Everything you need to streamline your hiring process
						and find exceptional talent.
					</p>

					<div className="features-grid">
						<div className="feature-card">
							<div className="feature-icon">
								<Sparkles size={32} />
							</div>
							<h3>AI-Powered Matching</h3>
							<p>
								Our intelligent algorithms analyze skills,
								experience, and culture fit to connect the right
								candidates with the right opportunities.
							</p>
						</div>

						<div className="feature-card">
							<div className="feature-icon">
								<Video size={32} />
							</div>
							<h3>Automated Screening</h3>
							<p>
								10-minute video interviews with AI-assisted
								evaluation help you shortlist candidates faster
								without sacrificing quality.
							</p>
						</div>

						<div className="feature-card">
							<div className="feature-icon">
								<FolderGit2 size={32} />
							</div>
							<h3>Portfolio Analysis</h3>
							<p>
								Deep dive into candidates' GitHub, portfolios,
								and work samples to assess real-world skills
								beyond the resume.
							</p>
						</div>

						<div className="feature-card">
							<div className="feature-icon">
								<Zap size={32} />
							</div>
							<h3>Instant Applications</h3>
							<p>
								One-click apply with smart profile auto-fill. No
								more repetitive form filling for candidates.
							</p>
						</div>

						<div className="feature-card">
							<div className="feature-icon">
								<Shield size={32} />
							</div>
							<h3>Bias-Free Hiring</h3>
							<p>
								Transparent AI scoring with audit trails ensures
								fair evaluation and compliance with hiring
								regulations.
							</p>
						</div>

						<div className="feature-card">
							<div className="feature-icon">
								<BarChart3 size={32} />
							</div>
							<h3>Analytics Dashboard</h3>
							<p>
								Real-time insights into your hiring funnel,
								time-to-hire metrics, and candidate engagement.
							</p>
						</div>
					</div>
				</div>
			</section>

			{/* How It Works Section */}
			<section className="how-it-works">
				<div className="container">
					<h2 className="section-title">How RecruiTech Works</h2>
					<p className="section-description">
						Your journey to the perfect job is just four steps away.
					</p>

					<div className="steps-grid">
						<div className="step-card">
							<div className="step-number">01</div>
							<div className="step-icon">
								<Users size={40} />
							</div>
							<h3>Create Your Profile</h3>
							<p>
								Sign up and build your professional profile.
								Upload your resume, add skills, and connect your
								portfolio.
							</p>
						</div>

						<div className="step-card">
							<div className="step-number">02</div>
							<div className="step-icon">
								<Sparkles size={40} />
							</div>
							<h3>Discover Opportunities</h3>
							<p>
								Browse AI-curated job matches or search for
								specific roles. Get personalized recommendations
								daily.
							</p>
						</div>

						<div className="step-card">
							<div className="step-number">03</div>
							<div className="step-icon">
								<Video size={40} />
							</div>
							<h3>Apply & Interview</h3>
							<p>
								One-click apply and complete video screenings.
								Track your applications in real-time.
							</p>
						</div>

						<div className="step-card">
							<div className="step-number">04</div>
							<div className="step-icon">
								<Briefcase size={40} />
							</div>
							<h3>Land Your Dream Job</h3>
							<p>
								Receive offers, negotiate, and accept. Start
								your new career journey with confidence.
							</p>
						</div>
					</div>
				</div>
			</section>

			{/* CTA Section */}
			<section className="cta">
				<div className="container">
					<div className="cta-content">
						<h2>Ready to Transform Your Hiring?</h2>
						<p>
							Join thousands of companies and candidates who are
							already using RecruiTech to find their perfect
							match.
						</p>
						<div className="cta-actions">
							<Link
								to="/signup"
								className="btn btn-primary btn-lg"
							>
								Get Started Free
								<span>→</span>
							</Link>
						</div>
					</div>
				</div>
			</section>
		</div>
	);
};

export default Landing;
