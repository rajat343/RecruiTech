import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Navbar from "./components/common/Navbar";
import Landing from "./pages/common/Landing";
import Login from "./pages/common/Login";
import Signup from "./pages/common/Signup";
import OAuthComplete from "./pages/common/OAuthComplete";
import CandidateOnboarding from "./pages/candidate/CandidateOnboarding";
import CandidateHome from "./pages/candidate/CandidateHome";
import RecruiterOnboarding from "./pages/recruiter/RecruiterOnboarding";
import RecruiterHome from "./pages/recruiter/RecruiterHome";

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
	const { user, loading } = useAuth();

	if (loading) {
		return (
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					minHeight: "100vh",
				}}
			>
				<div className="spinner"></div>
			</div>
		);
	}

	if (!user) {
		return <Navigate to="/login" replace />;
	}

	if (allowedRoles && !allowedRoles.includes(user.role)) {
		return <Navigate to="/" replace />;
	}

	return children;
};

function App() {
	return (
		<div className="app">
			<Navbar />
			<Routes>
				{/* Public Routes */}
				<Route path="/" element={<Landing />} />
				<Route path="/login" element={<Login />} />
				<Route path="/signup" element={<Signup />} />
				<Route path="/oauth-complete" element={<OAuthComplete />} />

				{/* Candidate Routes */}
				<Route
					path="/candidate/onboarding"
					element={
						<ProtectedRoute allowedRoles={["candidate"]}>
							<CandidateOnboarding />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/candidate/home"
					element={
						<ProtectedRoute allowedRoles={["candidate"]}>
							<CandidateHome />
						</ProtectedRoute>
					}
				/>

				{/* Recruiter Routes */}
				<Route
					path="/recruiter/onboarding"
					element={
						<ProtectedRoute allowedRoles={["recruiter"]}>
							<RecruiterOnboarding />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/recruiter/home"
					element={
						<ProtectedRoute allowedRoles={["recruiter"]}>
							<RecruiterHome />
						</ProtectedRoute>
					}
				/>

				{/* Placeholder Routes */}
				<Route
					path="/find-jobs"
					element={
						<div
							className="container"
							style={{
								padding: "4rem 1.5rem",
								textAlign: "center",
							}}
						>
							<h1>Find Jobs</h1>
							<p style={{ color: "var(--text-secondary)" }}>
								Browse through thousands of job opportunities
							</p>
						</div>
					}
				/>
				<Route
					path="/for-employers"
					element={
						<div
							className="container"
							style={{
								padding: "4rem 1.5rem",
								textAlign: "center",
							}}
						>
							<h1>For Employers</h1>
							<p style={{ color: "var(--text-secondary)" }}>
								Find the best talent for your company
							</p>
						</div>
					}
				/>
				<Route
					path="/about"
					element={
						<div
							className="container"
							style={{
								padding: "4rem 1.5rem",
								textAlign: "center",
							}}
						>
							<h1>About RecruiTech</h1>
							<p style={{ color: "var(--text-secondary)" }}>
								Revolutionizing recruitment with AI-powered
								solutions
							</p>
						</div>
					}
				/>

				{/* Catch all */}
				<Route path="*" element={<Navigate to="/" replace />} />
			</Routes>
		</div>
	);
}

export default App;
