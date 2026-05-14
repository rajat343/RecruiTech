import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Bell } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { graphqlRequest } from "../../utils/graphql";
import {
	computeUnseenApplicationCount,
	ensureRecruiterNotifBaseline,
} from "../../utils/recruiterApplicationNotifications";
import {
	computeUnseenCandidateApplicationCount,
	ensureCandidateNotifBaseline,
} from "../../utils/candidateApplicationNotifications";
import "./Navbar.css";

const dashboardPath = (role) =>
	role === "candidate" ? "/candidate/home" : "/recruiter/home";

const dashboardLabel = (role) =>
	role === "candidate" ? "Candidate's dashboard" : "Recruiter's dashboard";

const Navbar = () => {
	const { user, isAuthenticated, logout, token } = useAuth();
	const navigate = useNavigate();
	const { pathname } = useLocation();
	const [recruiterApplicantBell, setRecruiterApplicantBell] = useState(0);
	const [candidateApplicationBell, setCandidateApplicationBell] = useState(0);

	const dashPath = user?.role ? dashboardPath(user.role) : "";
	const onDashboard = Boolean(dashPath && pathname === dashPath);

	const refreshRecruiterApplicantBell = useCallback(async () => {
		if (!token || user?.role !== "recruiter" || !user?.id) {
			setRecruiterApplicantBell(0);
			return;
		}
		try {
			const data = await graphqlRequest(
				`
				query NavbarRecruiterJobs {
					myJobPosts(limit: 100, offset: 0) {
						id
						application_count
					}
				}
				`,
				{},
				token
			);
			const jobs = data.myJobPosts || [];
			ensureRecruiterNotifBaseline(user.id, jobs);
			setRecruiterApplicantBell(computeUnseenApplicationCount(user.id, jobs));
		} catch {
			setRecruiterApplicantBell(0);
		}
	}, [token, user]);

	const refreshCandidateApplicationBell = useCallback(async () => {
		if (!token || user?.role !== "candidate" || !user?.id) {
			setCandidateApplicationBell(0);
			return;
		}
		try {
			const data = await graphqlRequest(
				`
				query NavbarCandidateApplications {
					myApplications(limit: 200, offset: 0) {
						id
						status
						createdAt
						updatedAt
					}
					myInterviews {
						application_id
						status
						results_released
						overall_score
						completed_at
					}
				}
				`,
				{},
				token
			);
			const apps = data.myApplications || [];
			const ivs = data.myInterviews || [];
			ensureCandidateNotifBaseline(user.id, apps, ivs);
			setCandidateApplicationBell(
				computeUnseenCandidateApplicationCount(user.id, apps, ivs)
			);
		} catch {
			setCandidateApplicationBell(0);
		}
	}, [token, user]);

	useEffect(() => {
		queueMicrotask(() => {
			void refreshRecruiterApplicantBell();
		});
	}, [refreshRecruiterApplicantBell, pathname]);

	useEffect(() => {
		queueMicrotask(() => {
			void refreshCandidateApplicationBell();
		});
	}, [refreshCandidateApplicationBell, pathname]);

	useEffect(() => {
		if (user?.role !== "recruiter" || !token) return;
		const id = window.setInterval(refreshRecruiterApplicantBell, 60_000);
		const onFocus = () => refreshRecruiterApplicantBell();
		const onSeen = () => refreshRecruiterApplicantBell();
		window.addEventListener("focus", onFocus);
		window.addEventListener("recruiter-notifications-seen", onSeen);
		return () => {
			window.clearInterval(id);
			window.removeEventListener("focus", onFocus);
			window.removeEventListener("recruiter-notifications-seen", onSeen);
		};
	}, [user?.role, token, refreshRecruiterApplicantBell]);

	useEffect(() => {
		if (user?.role !== "candidate" || !token) return;
		const id = window.setInterval(refreshCandidateApplicationBell, 60_000);
		const onFocus = () => refreshCandidateApplicationBell();
		const onSeen = () => refreshCandidateApplicationBell();
		window.addEventListener("focus", onFocus);
		window.addEventListener("candidate-notifications-seen", onSeen);
		return () => {
			window.clearInterval(id);
			window.removeEventListener("focus", onFocus);
			window.removeEventListener("candidate-notifications-seen", onSeen);
		};
	}, [user?.role, token, refreshCandidateApplicationBell]);

	const handleLogout = () => {
		logout();
	};

	const goToDashboard = () => {
		if (user?.role) navigate(dashboardPath(user.role));
	};

	const handleRecruiterApplicantBell = () => {
		navigate("/recruiter/notifications");
	};

	const handleCandidateApplicationBell = () => {
		navigate("/candidate/notifications");
	};

	return (
		<nav className="navbar">
			<div className="container navbar-content">
				<Link to="/" className="navbar-logo">
					<div className="logo-icon">R</div>
					<span>
						Recrui<span className="text-gradient">Tech</span>
					</span>
				</Link>

				<div className="navbar-links">
					{isAuthenticated && user?.role ? (
						<Link to="/" className="nav-link">
							Home
						</Link>
					) : (
						<>
							<Link to="/" className="nav-link">
								Home
							</Link>
							<Link to="/find-jobs" className="nav-link">
								Find Jobs
							</Link>
							<Link to="/for-employers" className="nav-link">
								For Employers
							</Link>
							<Link to="/about" className="nav-link">
								About
							</Link>
						</>
					)}
				</div>

				<div className="navbar-actions">
					{isAuthenticated ? (
						<>
							{user?.role === "recruiter" && (
								<button
									type="button"
									className="navbar-notifications-btn"
									onClick={handleRecruiterApplicantBell}
									aria-label={
										recruiterApplicantBell > 0
											? `${recruiterApplicantBell} new applicant${
													recruiterApplicantBell === 1 ? "" : "s"
											  }. Open notifications.`
											: "Application notifications"
									}
									title={
										recruiterApplicantBell > 0
											? `New applicants: ${recruiterApplicantBell} — open list`
											: "Application notifications"
									}
								>
									<Bell size={22} strokeWidth={2} aria-hidden />
									{recruiterApplicantBell > 0 ? (
										<span className="navbar-notifications-badge">
											{recruiterApplicantBell > 99
												? "99+"
												: recruiterApplicantBell}
										</span>
									) : null}
								</button>
							)}
							{user?.role === "candidate" && (
								<button
									type="button"
									className="navbar-notifications-btn"
									onClick={handleCandidateApplicationBell}
									aria-label={
										candidateApplicationBell > 0
											? `${candidateApplicationBell} application update${
													candidateApplicationBell === 1 ? "" : "s"
											  }. Open notifications.`
											: "Application updates"
									}
									title={
										candidateApplicationBell > 0
											? `Application updates: ${candidateApplicationBell} — open list`
											: "Application updates"
									}
								>
									<Bell size={22} strokeWidth={2} aria-hidden />
									{candidateApplicationBell > 0 ? (
										<span className="navbar-notifications-badge">
											{candidateApplicationBell > 99
												? "99+"
												: candidateApplicationBell}
										</span>
									) : null}
								</button>
							)}
							<button
								type="button"
								onClick={goToDashboard}
								className={
									onDashboard
										? "btn navbar-dashboard-btn navbar-dashboard-btn--active"
										: "btn btn-outline navbar-dashboard-btn"
								}
								aria-current={onDashboard ? "page" : undefined}
							>
								{onDashboard
									? dashboardLabel(user.role)
									: "Dashboard"}
							</button>
							<button
								type="button"
								onClick={handleLogout}
								className="btn btn-primary"
							>
								Log Out
							</button>
						</>
					) : (
						<>
							<Link to="/login" className="btn btn-outline">
								Log In
							</Link>
							<Link to="/signup" className="btn btn-primary">
								Sign Up
							</Link>
						</>
					)}
				</div>
			</div>
		</nav>
	);
};

export default Navbar;
