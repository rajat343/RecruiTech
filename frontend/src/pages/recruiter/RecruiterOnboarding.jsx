import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { graphqlRequest } from "../../utils/graphql";
import axios from "axios";
import {
	User,
	Mail,
	Phone,
	Building2,
	Globe,
	AlertCircle,
	Search,
	Plus,
} from "lucide-react";
import "./RecruiterOnboarding.css";

const RecruiterOnboarding = () => {
	const [searchParams] = useSearchParams();
	const isOAuth = searchParams.get("oauth") === "true";
	const navigate = useNavigate();
	const { user, login, token } = useAuth();

	const [step, setStep] = useState(1); // 1: Select Company, 2: Fill Details
	const [selectedCompany, setSelectedCompany] = useState(null);
	const [showCreateCompany, setShowCreateCompany] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");

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

	const [error, setError] = useState("");
	const [companies, setCompanies] = useState([]);
	const [companiesLoading, setCompaniesLoading] = useState(false);
	const [companyCreating, setCompanyCreating] = useState(false);
	const [recruiterCreating, setRecruiterCreating] = useState(false);

	const [companyData, setCompanyData] = useState({
		name: "",
		domain: "",
	});

	// Initialize recruiterData with email from OAuth or user
	const [recruiterData, setRecruiterData] = useState(() => ({
		first_name: "",
		last_name: "",
		email: oauthData?.email || user?.email || "",
		phone_number: "",
	}));

	useEffect(() => {
		// Load companies with search filter
		const fetchCompanies = async () => {
			setCompaniesLoading(true);
			try {
				const data = await graphqlRequest(
					`
				query GetCompanies($is_verified: Boolean, $search: String) {
					companies(is_verified: $is_verified, search: $search, limit: 10) {
						id
						name
						domain
						is_verified
					}
				}
				`,
					{ is_verified: true, search: searchTerm || null },
					token
				);
				setCompanies(data.companies);
			} catch (err) {
				console.error("Fetch companies error:", err);
			} finally {
				setCompaniesLoading(false);
			}
		};

		if (token) {
			// Debounce search - wait 300ms after user stops typing
			const timeoutId = setTimeout(() => {
				fetchCompanies();
			}, 300);

			return () => clearTimeout(timeoutId);
		}
	}, [token, searchTerm]);

	const handleCompanySelect = (company) => {
		setSelectedCompany(company);
		setStep(2);
	};

	const handleCreateCompany = async (e) => {
		e.preventDefault();
		setError("");

		if (!companyData.name || !companyData.domain) {
			setError("Please fill in all company fields");
			return;
		}

		setCompanyCreating(true);

		try {
			const data = await graphqlRequest(
				`
				mutation CreateCompany($input: CompanyInput!) {
					createCompany(input: $input) {
						id
						name
						domain
					}
				}
				`,
				{ input: companyData },
				token
			);
			setSelectedCompany(data.createCompany);
			setShowCreateCompany(false);
			setStep(2);
		} catch (err) {
			console.error("Create company error:", err);
			setError(err.message || "Failed to create company");
		} finally {
			setCompanyCreating(false);
		}
	};

	const handleRecruiterSubmit = async (e) => {
		e.preventDefault();
		setError("");

		if (
			!recruiterData.first_name ||
			!recruiterData.last_name ||
			!recruiterData.email
		) {
			setError("Please fill in all required fields");
			return;
		}

		setRecruiterCreating(true);

		try {
			await graphqlRequest(
				`
				mutation CreateRecruiter($input: RecruiterInput!) {
					createRecruiter(input: $input) {
						id
						first_name
						last_name
						email
					}
				}
				`,
				{
					input: {
						first_name: recruiterData.first_name,
						last_name: recruiterData.last_name,
						email: recruiterData.email,
						phone_number: recruiterData.phone_number || null,
						company_id: selectedCompany.id,
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
							email: recruiterData.email,
							role: "recruiter",
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
					setRecruiterCreating(false);
					return;
				}
			}

			navigate("/recruiter/home");
		} catch (err) {
			console.error("Create recruiter error:", err);
			setError(err.message || "Failed to create profile");
			setRecruiterCreating(false);
		}
	};

	if (step === 1) {
		return (
			<div className="onboarding-page">
				<div className="onboarding-container">
					<div className="onboarding-card">
						<div className="onboarding-header">
							<h1>Select Your Company</h1>
							<p>
								Choose your company from the list or create a
								new one
							</p>
						</div>

						{error && (
							<div className="alert alert-error">
								<AlertCircle size={20} />
								<span>{error}</span>
							</div>
						)}

						{!showCreateCompany ? (
							<>
								<div className="search-box">
									<Search size={20} />
									<input
										type="text"
										placeholder="Search companies..."
										className="search-input"
										value={searchTerm}
										onChange={(e) =>
											setSearchTerm(e.target.value)
										}
									/>
								</div>

								<div className="companies-list">
									{companiesLoading ? (
										<p>Loading companies...</p>
									) : companies && companies.length > 0 ? (
										companies.map((company) => (
											<button
												key={company.id}
												className="company-item"
												onClick={() =>
													handleCompanySelect(company)
												}
											>
												<Building2 size={24} />
												<div className="company-info">
													<h3>{company.name}</h3>
													<p>{company.domain}</p>
												</div>
											</button>
										))
									) : (
										<p className="no-results">
											No companies found. Create a new one
											below.
										</p>
									)}
								</div>

								<button
									className="btn btn-outline btn-full"
									onClick={() => setShowCreateCompany(true)}
								>
									<Plus size={20} />
									Create New Company
								</button>
							</>
						) : (
							<form
								onSubmit={handleCreateCompany}
								className="onboarding-form"
							>
								<div className="form-group">
									<label htmlFor="company_name">
										<Building2 size={18} />
										Company Name *
									</label>
									<input
										type="text"
										id="company_name"
										className="input-field"
										placeholder="Acme Inc."
										value={companyData.name}
										onChange={(e) =>
											setCompanyData((prev) => ({
												...prev,
												name: e.target.value,
											}))
										}
										required
									/>
								</div>

								<div className="form-group">
									<label htmlFor="company_domain">
										<Globe size={18} />
										Company Domain *
									</label>
									<input
										type="text"
										id="company_domain"
										className="input-field"
										placeholder="acme.com"
										value={companyData.domain}
										onChange={(e) =>
											setCompanyData((prev) => ({
												...prev,
												domain: e.target.value,
											}))
										}
										required
									/>
									<small className="field-hint">
										Enter your company's domain name (e.g.,
										google.com)
									</small>
								</div>

								<div className="button-group">
									<button
										type="button"
										className="btn btn-outline"
										onClick={() =>
											setShowCreateCompany(false)
										}
									>
										Cancel
									</button>
									<button
										type="submit"
										className="btn btn-primary"
										disabled={companyCreating}
									>
										{companyCreating
											? "Creating..."
											: "Create Company"}
									</button>
								</div>
							</form>
						)}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="onboarding-page">
			<div className="onboarding-container">
				<div className="onboarding-card">
					<div className="onboarding-header">
						<h1>Complete Your Profile</h1>
						<p>
							Fill in your details for{" "}
							<strong>{selectedCompany?.name}</strong>
						</p>
					</div>

					{error && (
						<div className="alert alert-error">
							<AlertCircle size={20} />
							<span>{error}</span>
						</div>
					)}

					<form
						onSubmit={handleRecruiterSubmit}
						className="onboarding-form"
					>
						<div className="form-row">
							<div className="form-group">
								<label htmlFor="first_name">
									<User size={18} />
									First Name *
								</label>
								<input
									type="text"
									id="first_name"
									className="input-field"
									placeholder="John"
									value={recruiterData.first_name}
									onChange={(e) =>
										setRecruiterData((prev) => ({
											...prev,
											first_name: e.target.value,
										}))
									}
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
									className="input-field"
									placeholder="Doe"
									value={recruiterData.last_name}
									onChange={(e) =>
										setRecruiterData((prev) => ({
											...prev,
											last_name: e.target.value,
										}))
									}
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
								className="input-field"
								placeholder="john.doe@example.com"
								value={recruiterData.email}
								onChange={(e) =>
									setRecruiterData((prev) => ({
										...prev,
										email: e.target.value,
									}))
								}
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
								className="input-field"
								placeholder="+1 (555) 123-4567"
								value={recruiterData.phone_number}
								onChange={(e) =>
									setRecruiterData((prev) => ({
										...prev,
										phone_number: e.target.value,
									}))
								}
							/>
						</div>

						<div className="button-group">
							<button
								type="button"
								className="btn btn-outline"
								onClick={() => setStep(1)}
							>
								Back
							</button>
							<button
								type="submit"
								className="btn btn-primary"
								disabled={recruiterCreating}
							>
								{recruiterCreating
									? "Creating Profile..."
									: "Complete Profile"}
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
};

export default RecruiterOnboarding;
