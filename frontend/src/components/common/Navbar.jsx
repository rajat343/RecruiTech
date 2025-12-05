import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./Navbar.css";

const Navbar = () => {
	const { user, isAuthenticated, logout } = useAuth();
	const navigate = useNavigate();

	const handleLogout = () => {
		logout();
	};

	const handleDashboardClick = () => {
		if (user?.role === "candidate") {
			navigate("/candidate/home");
		} else if (user?.role === "recruiter") {
			navigate("/recruiter/home");
		}
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
				</div>

				<div className="navbar-actions">
					{isAuthenticated ? (
						<>
							<button
								onClick={handleDashboardClick}
								className="btn btn-outline"
							>
								Dashboard
							</button>
							<button
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
