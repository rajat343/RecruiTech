import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./Navbar.css";

const dashboardPath = (role) =>
	role === "candidate" ? "/candidate/home" : "/recruiter/home";

const dashboardLabel = (role) =>
	role === "candidate" ? "Candidate's dashboard" : "Recruiter's dashboard";

const Navbar = () => {
	const { user, isAuthenticated, logout } = useAuth();
	const navigate = useNavigate();
	const { pathname } = useLocation();

	const dashPath = user?.role ? dashboardPath(user.role) : "";
	const onDashboard = Boolean(dashPath && pathname === dashPath);

	const handleLogout = () => {
		logout();
	};

	const goToDashboard = () => {
		if (user?.role) navigate(dashboardPath(user.role));
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
