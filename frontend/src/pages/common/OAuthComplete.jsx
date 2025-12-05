import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import { Loader2, AlertCircle } from "lucide-react";
import "./Auth.css";

const OAuthComplete = () => {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const { login } = useAuth();
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const completeOAuth = async () => {
			try {
				const token = searchParams.get("token");
				const role = searchParams.get("role");
				const needsRegistration = searchParams.get("needsRegistration");
				const email = searchParams.get("email");
				const picture = searchParams.get("picture");

				// If we have a token, the user already exists - just login
				if (token) {
					// Fetch user data
					const apiUrl =
						import.meta.env.VITE_GRAPHQL_URL ||
						"http://localhost:4000/graphql";
					const response = await axios.post(
						apiUrl,
						{
							query: `query Me { me { id email role is_admin } }`,
						},
						{
							headers: {
								Authorization: `Bearer ${token}`,
							},
						}
					);

					if (response.data.data?.me) {
						login(token, response.data.data.me);
						// Redirect based on role
						if (response.data.data.me.role === "candidate") {
							navigate("/candidate/home");
						} else if (response.data.data.me.role === "recruiter") {
							navigate("/recruiter/home");
						}
					}
				} else if (needsRegistration === "true") {
					// Need to complete registration
					// Store OAuth data in sessionStorage
					sessionStorage.setItem(
						"oauthData",
						JSON.stringify({ email, picture, role })
					);
					// Redirect to role-specific onboarding with OAuth data
					if (role === "candidate") {
						navigate("/candidate/onboarding?oauth=true");
					} else if (role === "recruiter") {
						navigate("/recruiter/onboarding?oauth=true");
					}
				} else {
					setError("Invalid OAuth response");
					setLoading(false);
				}
			} catch (err) {
				console.error("OAuth complete error:", err);
				setError(err.message || "Something went wrong");
				setLoading(false);
			}
		};

		completeOAuth();
	}, [searchParams, navigate, login]);

	if (loading) {
		return (
			<div className="auth-page">
				<div className="auth-container">
					<div className="auth-card" style={{ textAlign: "center" }}>
						<Loader2
							size={48}
							className="spinner"
							style={{ margin: "0 auto" }}
						/>
						<h2 style={{ marginTop: "1rem" }}>
							Completing sign in...
						</h2>
						<p style={{ color: "var(--text-secondary)" }}>
							Please wait while we set up your account
						</p>
					</div>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="auth-page">
				<div className="auth-container">
					<div className="auth-card">
						<div className="alert alert-error">
							<AlertCircle size={20} />
							<span>{error}</span>
						</div>
						<button
							onClick={() => navigate("/login")}
							className="btn btn-primary btn-full"
						>
							Back to Login
						</button>
					</div>
				</div>
			</div>
		);
	}

	return null;
};

export default OAuthComplete;
