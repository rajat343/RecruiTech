import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { graphqlRequest } from "../../utils/graphql";
import axios from "axios";
import {
	User,
	Mail,
	Phone,
	FileText,
	Github,
	Code2,
	Globe,
	AlertCircle,
} from "lucide-react";
import "./CandidateOnboarding.css";

const CandidateOnboarding = () => {
	const [searchParams] = useSearchParams();
	const isOAuth = searchParams.get("oauth") === "true";
	const navigate = useNavigate();
	const { user, login, token } = useAuth();

	// Initialize oauthData from sessionStorage only once
	const [oauthData] = useState(() => {
		if (isOAuth) {
			const data = sessionStorage.getItem("oauthData");
			if (data) {
				try {
					return JSON.parse(data);
				} catch (e) {
					console.error("Failed to parse OAuth data:", e);
					return null;
				}
			}
		}
		return null;
	});

	// Initialize formData with email from OAuth or user
	const [formData, setFormData] = useState(() => ({
		first_name: "",
		last_name: "",
		email: oauthData?.email || user?.email || "",
		phone_number: "",
		resume_url: "",
		github_url: "",
		leetcode_url: "",
		portfolio_url: "",
		profile_summary: "",
		status: "actively_looking",
	}));

	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	const handleChange = (e) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError("");

		// Validate required fields
		if (
			!formData.first_name ||
			!formData.last_name ||
			!formData.email ||
			!formData.resume_url
		) {
			setError("Please fill in all required fields");
			return;
		}

		setLoading(true);

		try {
			// Create candidate profile
			await graphqlRequest(
				`
				mutation CreateCandidate($input: CandidateInput!) {
					createCandidate(input: $input) {
						id
						first_name
						last_name
						email
					}
				}
			`,
				{
					input: {
						first_name: formData.first_name,
						last_name: formData.last_name,
						email: formData.email,
						phone_number: formData.phone_number || null,
						resume_url: formData.resume_url,
						github_url: formData.github_url || null,
						leetcode_url: formData.leetcode_url || null,
						portfolio_url: formData.portfolio_url || null,
						profile_summary: formData.profile_summary || null,
						status: formData.status,
					},
				},
				token
			);

			// If OAuth, complete registration
			if (isOAuth && oauthData) {
				try {
					const apiUrl =
						import.meta.env.VITE_API_URL || "http://localhost:4000";
					const response = await axios.post(
						`${apiUrl}/auth/google/register`,
						{
							google_id: oauthData.email, // Use email as temp ID
							email: formData.email,
							role: "candidate",
							profile_pic: oauthData.picture,
						}
					);

					if (response.data.token) {
						login(response.data.token, response.data.user);
						sessionStorage.removeItem("oauthData");
					}
				} catch (err) {
					console.error("OAuth registration error:", err);
					setError(
						err.response?.data?.error ||
							"Failed to complete registration"
					);
					setLoading(false);
					return;
				}
			}

			navigate("/candidate/home");
		} catch (err) {
			console.error("Create candidate error:", err);
			setError(err.message || "Failed to create profile");
			setLoading(false);
		}
	};

	return (
		<div className="onboarding-page">
			<div className="onboarding-container">
				<div className="onboarding-card">
					<div className="onboarding-header">
						<h1>Complete Your Profile</h1>
						<p>
							Help employers find you by completing your candidate
							profile
						</p>
					</div>

					{error && (
						<div className="alert alert-error">
							<AlertCircle size={20} />
							<span>{error}</span>
						</div>
					)}

					<form onSubmit={handleSubmit} className="onboarding-form">
						<div className="form-row">
							<div className="form-group">
								<label htmlFor="first_name">
									<User size={18} />
									First Name *
								</label>
								<input
									type="text"
									id="first_name"
									name="first_name"
									className="input-field"
									placeholder="John"
									value={formData.first_name}
									onChange={handleChange}
									required
								/>
							</div>

							<div className="form-group">
								<label htmlFor="last_name">
									<User size={18} />
									Last Name *
								</label>
								<input
									type="text"
									id="last_name"
									name="last_name"
									className="input-field"
									placeholder="Doe"
									value={formData.last_name}
									onChange={handleChange}
									required
								/>
							</div>
						</div>

						<div className="form-group">
							<label htmlFor="email">
								<Mail size={18} />
								Email Address *
							</label>
							<input
								type="email"
								id="email"
								name="email"
								className="input-field"
								placeholder="john.doe@example.com"
								value={formData.email}
								onChange={handleChange}
								readOnly={isOAuth || !!user?.email}
								required
							/>
						</div>

						<div className="form-group">
							<label htmlFor="phone_number">
								<Phone size={18} />
								Phone Number
							</label>
							<input
								type="tel"
								id="phone_number"
								name="phone_number"
								className="input-field"
								placeholder="+1 (555) 123-4567"
								value={formData.phone_number}
								onChange={handleChange}
							/>
						</div>

						<div className="form-group">
							<label htmlFor="resume_url">
								<FileText size={18} />
								Resume URL *
							</label>
							<input
								type="url"
								id="resume_url"
								name="resume_url"
								className="input-field"
								placeholder="https://drive.google.com/..."
								value={formData.resume_url}
								onChange={handleChange}
								required
							/>
							<small className="field-hint">
								Upload your resume to Google Drive or Dropbox
								and paste the link
							</small>
						</div>

						<div className="form-group">
							<label htmlFor="github_url">
								<Github size={18} />
								GitHub Profile
							</label>
							<input
								type="url"
								id="github_url"
								name="github_url"
								className="input-field"
								placeholder="https://github.com/username"
								value={formData.github_url}
								onChange={handleChange}
							/>
						</div>

						<div className="form-group">
							<label htmlFor="leetcode_url">
								<Code2 size={18} />
								LeetCode Profile
							</label>
							<input
								type="url"
								id="leetcode_url"
								name="leetcode_url"
								className="input-field"
								placeholder="https://leetcode.com/username"
								value={formData.leetcode_url}
								onChange={handleChange}
							/>
						</div>

						<div className="form-group">
							<label htmlFor="portfolio_url">
								<Globe size={18} />
								Portfolio Website
							</label>
							<input
								type="url"
								id="portfolio_url"
								name="portfolio_url"
								className="input-field"
								placeholder="https://yourportfolio.com"
								value={formData.portfolio_url}
								onChange={handleChange}
							/>
						</div>

						<div className="form-group">
							<label htmlFor="profile_summary">
								<FileText size={18} />
								Profile Summary
							</label>
							<textarea
								id="profile_summary"
								name="profile_summary"
								className="input-field"
								rows="4"
								placeholder="Tell us about yourself, your skills, and what you're looking for..."
								value={formData.profile_summary}
								onChange={handleChange}
							/>
						</div>

						<div className="form-group">
							<label htmlFor="status">Current Status</label>
							<select
								id="status"
								name="status"
								className="input-field"
								value={formData.status}
								onChange={handleChange}
							>
								<option value="actively_looking">
									Actively Looking
								</option>
								<option value="casually_looking">
									Casually Looking
								</option>
								<option value="not_looking">Not Looking</option>
							</select>
						</div>

						<button
							type="submit"
							className="btn btn-primary btn-full"
							disabled={loading}
						>
							{loading
								? "Creating Profile..."
								: "Complete Profile"}
						</button>
					</form>
				</div>
			</div>
		</div>
	);
};

export default CandidateOnboarding;
