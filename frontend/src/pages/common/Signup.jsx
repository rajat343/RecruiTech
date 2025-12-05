import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { Mail, Lock, AlertCircle, UserCircle, Briefcase } from "lucide-react";
import "./Auth.css";

const Signup = () => {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [role, setRole] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const navigate = useNavigate();
	const { login } = useAuth();

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError("");

		if (!email || !password || !confirmPassword || !role) {
			setError("Please fill in all fields");
			return;
		}

		if (password !== confirmPassword) {
			setError("Passwords do not match");
			return;
		}

		if (password.length < 6) {
			setError("Password must be at least 6 characters");
			return;
		}

		setLoading(true);

		try {
			const response = await axios.post(
				import.meta.env.VITE_GRAPHQL_URL ||
					"http://localhost:4000/graphql",
				{
					query: `
						mutation Register($email: String!, $password: String!, $role: UserRole!) {
							register(email: $email, password: $password, role: $role) {
								token
								user {
									id
									email
									role
									profile_pic
									is_admin
								}
							}
						}
					`,
					variables: { email, password, role },
				}
			);

			if (response.data.errors) {
				setError(response.data.errors[0].message);
				setLoading(false);
				return;
			}

			const { token, user } = response.data.data.register;
			login(token, user);

			// Redirect to onboarding based on role
			if (user.role === "candidate") {
				navigate("/candidate/onboarding");
			} else if (user.role === "recruiter") {
				navigate("/recruiter/onboarding");
			}
		} catch (err) {
			console.error("Signup error:", err);
			setError(
				err.response?.data?.errors?.[0]?.message ||
					"Failed to sign up. Please try again."
			);
			setLoading(false);
		}
	};

	const handleGoogleSignup = (selectedRole) => {
		if (!selectedRole) {
			setError("Please select a role first");
			return;
		}
		const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:4000";
		window.location.href = `${apiUrl}/auth/google?role=${selectedRole}`;
	};

	return (
		<div className="auth-page">
			<div className="auth-container">
				<div className="auth-card">
					<div className="auth-header">
						<h1>Join RecruiTech</h1>
						<p>Create your account and get started</p>
					</div>

					{error && (
						<div className="alert alert-error">
							<AlertCircle size={20} />
							<span>{error}</span>
						</div>
					)}

					<form onSubmit={handleSubmit} className="auth-form">
						<div className="form-group">
							<label>I am a...</label>
							<div className="role-selector">
								<button
									type="button"
									className={`role-card ${
										role === "candidate" ? "active" : ""
									}`}
									onClick={() => setRole("candidate")}
								>
									<UserCircle size={32} />
									<div>
										<h3>Candidate</h3>
										<p>Looking for opportunities</p>
									</div>
								</button>
								<button
									type="button"
									className={`role-card ${
										role === "recruiter" ? "active" : ""
									}`}
									onClick={() => setRole("recruiter")}
								>
									<Briefcase size={32} />
									<div>
										<h3>Recruiter</h3>
										<p>Hiring talent</p>
									</div>
								</button>
							</div>
						</div>

						<div className="form-group">
							<label htmlFor="email">
								<Mail size={18} />
								Email Address
							</label>
							<input
								type="email"
								id="email"
								className="input-field"
								placeholder="you@example.com"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
							/>
						</div>

						<div className="form-group">
							<label htmlFor="password">
								<Lock size={18} />
								Password
							</label>
							<input
								type="password"
								id="password"
								className="input-field"
								placeholder="At least 6 characters"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
							/>
						</div>

						<div className="form-group">
							<label htmlFor="confirmPassword">
								<Lock size={18} />
								Confirm Password
							</label>
							<input
								type="password"
								id="confirmPassword"
								className="input-field"
								placeholder="Re-enter your password"
								value={confirmPassword}
								onChange={(e) =>
									setConfirmPassword(e.target.value)
								}
								required
							/>
						</div>

						<button
							type="submit"
							className="btn btn-primary btn-full"
							disabled={loading || !role}
						>
							{loading ? "Creating account..." : "Sign Up"}
						</button>
					</form>

					<div className="divider">
						<span>OR</span>
					</div>

					<button
						type="button"
						onClick={() => handleGoogleSignup(role)}
						className="btn btn-google"
						disabled={!role}
					>
						<svg width="20" height="20" viewBox="0 0 20 20">
							<path
								fill="#4285F4"
								d="M19.6 10.23c0-.82-.1-1.42-.25-2.05H10v3.72h5.5c-.15.96-.74 2.31-2.04 3.22v2.45h3.16c1.89-1.73 2.98-4.3 2.98-7.34z"
							/>
							<path
								fill="#34A853"
								d="M13.46 15.13c-.83.59-1.96 1-3.46 1-2.64 0-4.88-1.74-5.68-4.15H1.07v2.52C2.72 17.75 6.09 20 10 20c2.7 0 4.96-.89 6.62-2.42l-3.16-2.45z"
							/>
							<path
								fill="#FBBC05"
								d="M3.99 10c0-.69.12-1.35.32-1.97V5.51H1.07A9.973 9.973 0 000 10c0 1.61.39 3.14 1.07 4.49l3.24-2.52c-.2-.62-.32-1.28-.32-1.97z"
							/>
							<path
								fill="#EA4335"
								d="M10 3.88c1.88 0 3.13.81 3.85 1.48l2.84-2.76C14.96.99 12.7 0 10 0 6.09 0 2.72 2.25 1.07 5.51l3.24 2.52C5.12 5.62 7.36 3.88 10 3.88z"
							/>
						</svg>
						Continue with Google
					</button>

					<p className="auth-footer">
						Already have an account?{" "}
						<Link to="/login" className="auth-link">
							Log in
						</Link>
					</p>
				</div>
			</div>
		</div>
	);
};

export default Signup;
