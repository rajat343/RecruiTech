import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { graphqlRequest } from "../../utils/graphql";
import axios from "axios";
import { Country, State, City } from "country-state-city";
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

const isValidEmail = (value) => {
	if (!value) return false;
	return /\S+@\S+\.\S+/.test(value);
};

const isValidPhone = (value) => {
	if (!value) return true; // optional at schema level; UI can enforce separately
	return /^[0-9+()\-.\s]{7,}$/.test(value);
};

const isValidUrl = (value) => {
	if (!value) return true;
	try {
		// eslint-disable-next-line no-new
		new URL(value);
		return true;
	} catch {
		return false;
	}
};

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
		// Core identity
		first_name: "",
		last_name: "",
		email: oauthData?.email || user?.email || "",
		phone_number: "",
		// Location (country/state codes from dataset, city free-text)
		location_city: "",
		location_state: "",
		location_country: "",
		// Work eligibility
		work_authorized: null,
		sponsorship_needed: null,
		// Resume
		resume_url: "",
		// Links
		linkedin_url: "",
		github_url: "",
		leetcode_url: "",
		portfolio_url: "",
		// Professional summary
		skills: "",
		profile_summary: "",
		// Detailed experiences & education
		work_experiences: [],
		educations: [],
		// Status
		status: "actively_looking",
		// Demographics (stored separately in backend)
		demographics_race_ethnicity: "",
		demographics_gender: "",
		demographics_disability: "",
	}));

	const [step, setStep] = useState(1);
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	const handleChange = (e) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleNext = () => {
		setError("");

		if (step === 1) {
			const states = formData.location_country
				? State.getStatesOfCountry(formData.location_country)
				: [];
			const needsState = states.length > 0;
			if (
				!formData.first_name ||
				!formData.last_name ||
				!formData.email ||
				!formData.resume_url ||
				!formData.location_country ||
				(needsState && !formData.location_state) ||
				!formData.location_city
			) {
				setError("Please fill in all required fields on this step.");
				return;
			}
			if (!isValidEmail(formData.email)) {
				setError("Please enter a valid email address.");
				return;
			}
			if (!isValidPhone(formData.phone_number)) {
				setError("Please enter a valid phone number.");
				return;
			}
			if (!isValidUrl(formData.resume_url)) {
				setError("Please enter a valid resume URL.");
				return;
			}
		}

		if (step === 2) {
			if (formData.work_authorized === null) {
				setError("Please answer the work authorization question.");
				return;
			}
			if (formData.sponsorship_needed === null) {
				setError("Please answer the sponsorship question.");
				return;
			}
		}

		if (step === 3) {
			if (
				formData.linkedin_url &&
				!isValidUrl(formData.linkedin_url)
			) {
				setError("Please enter a valid LinkedIn URL.");
				return;
			}
			if (formData.github_url && !isValidUrl(formData.github_url)) {
				setError("Please enter a valid GitHub URL.");
				return;
			}
			if (formData.portfolio_url && !isValidUrl(formData.portfolio_url)) {
				setError("Please enter a valid portfolio URL.");
				return;
			}
			if (formData.leetcode_url && !isValidUrl(formData.leetcode_url)) {
				setError("Please enter a valid LeetCode URL.");
				return;
			}

			// Basic validation for work experience and education entries
			for (const exp of formData.work_experiences) {
				const hasAny =
					exp.title ||
					exp.company ||
					exp.start_date ||
					exp.end_date ||
					exp.description;
				if (!hasAny) continue;
				if (!exp.title || !exp.company || !exp.start_date) {
					setError(
						"Please fill in title, company, and start date for each work experience entry."
					);
					return;
				}
				if (
					!exp.is_current &&
					exp.start_date &&
					exp.end_date &&
					new Date(exp.start_date) > new Date(exp.end_date)
				) {
					setError(
						"Work experience end date cannot be before start date."
					);
					return;
				}
			}

			for (const edu of formData.educations) {
				const hasAny =
					edu.school || edu.degree || edu.graduation_year;
				if (!hasAny) continue;
				if (!edu.school || !edu.degree) {
					setError(
						"Please fill in school and degree for each education entry."
					);
					return;
				}
			}
		}

		setStep((prev) => Math.min(prev + 1, 4));
	};

	const handleBack = () => {
		setError("");
		setStep((prev) => Math.max(prev - 1, 1));
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError("");

		// Final cross-check of the core required fields
		if (
			!formData.first_name ||
			!formData.last_name ||
			!formData.email ||
			!formData.resume_url
		) {
			setError("Please complete the required core information.");
			setStep(1);
			return;
		}

		setLoading(true);

		try {
			const skillsArray = formData.skills
				? formData.skills
						.split(",")
						.map((s) => s.trim())
						.filter(Boolean)
				: [];

			const workExperiencesInput = (formData.work_experiences || [])
				.map((exp) => ({
					title: exp.title || null,
					company: exp.company || null,
					start_date: exp.start_date || null,
					end_date: exp.is_current ? null : exp.end_date || null,
					is_current: !!exp.is_current,
					description: exp.description || null,
				}))
				.filter(
					(exp) =>
						exp.title ||
						exp.company ||
						exp.start_date ||
						exp.end_date ||
						exp.description
				);

			const educationsInput = (formData.educations || [])
				.map((edu) => ({
					school: edu.school || null,
					degree: edu.degree || null,
					graduation_year: edu.graduation_year
						? parseInt(edu.graduation_year, 10)
						: null,
				}))
				.filter(
					(edu) => edu.school || edu.degree || edu.graduation_year
				);

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
						// Location
						location_city: formData.location_city || null,
						location_state: formData.location_state || null,
						location_country: formData.location_country || null,
						// Work eligibility
						work_authorized:
							formData.work_authorized !== null
								? formData.work_authorized
								: null,
						sponsorship_needed:
							formData.sponsorship_needed !== null
								? formData.sponsorship_needed
								: null,
						// Links
						linkedin_url: formData.linkedin_url || null,
						github_url: formData.github_url || null,
						leetcode_url: formData.leetcode_url || null,
						portfolio_url: formData.portfolio_url || null,
						// Professional summary
						resume_url: formData.resume_url,
						skills: skillsArray.length ? skillsArray : null,
						profile_summary: formData.profile_summary || null,
						// Detailed experience & education
						work_experiences:
							workExperiencesInput.length > 0
								? workExperiencesInput
								: null,
						educations:
							educationsInput.length > 0
								? educationsInput
								: null,
						// Status & demographics
						status: formData.status,
						demographics: {
							race_ethnicity:
								formData.demographics_race_ethnicity || null,
							gender: formData.demographics_gender || null,
							disability:
								formData.demographics_disability || null,
						},
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
								Answer a few questions once and reuse for all
								your applications.
							</p>
							<div className="onboarding-steps">
								<div
									className={`onboarding-step ${
										step >= 1 ? "active" : ""
									}`}
								>
									<span>1</span>
									<p>Personal</p>
								</div>
								<div
									className={`onboarding-step ${
										step >= 2 ? "active" : ""
									}`}
								>
									<span>2</span>
									<p>Eligibility</p>
								</div>
								<div
									className={`onboarding-step ${
										step >= 3 ? "active" : ""
									}`}
								>
									<span>3</span>
									<p>Experience</p>
								</div>
								<div
									className={`onboarding-step ${
										step >= 4 ? "active" : ""
									}`}
								>
									<span>4</span>
									<p>Demographics</p>
								</div>
							</div>
						</div>

						{error && (
							<div className="alert alert-error">
								<AlertCircle size={20} />
								<span>{error}</span>
							</div>
						)}

						<form
							onSubmit={handleSubmit}
							className="onboarding-form"
						>
							{/* Step 1: Personal + resume + location */}
							{step === 1 && (
								<>
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
											Phone Number *
										</label>
										<input
											type="tel"
											id="phone_number"
											name="phone_number"
											className="input-field"
											placeholder="+1 (555) 123-4567"
											value={formData.phone_number}
											onChange={handleChange}
											required
										/>
									</div>

									<div className="form-row">
										<div className="form-group">
											<label htmlFor="location_country">
												Country *
											</label>
											<select
												id="location_country"
												name="location_country"
												className="input-field"
												value={formData.location_country}
												onChange={(e) =>
													setFormData((prev) => ({
														...prev,
														location_country:
															e.target.value,
														location_state: "",
														location_city: "",
													}))
												}
												required
											>
												<option value="">
													Select country
												</option>
												{Country.getAllCountries().map(
													(c) => (
														<option
															key={c.isoCode}
															value={c.isoCode}
														>
															{c.name}
														</option>
													)
												)}
											</select>
										</div>
										<div className="form-group">
											<label htmlFor="location_state">
												State / Province *
											</label>
											<select
												id="location_state"
												name="location_state"
												className="input-field"
												value={formData.location_state}
												onChange={(e) =>
													setFormData((prev) => ({
														...prev,
														location_state:
															e.target.value,
														location_city: "",
													}))
												}
												disabled={
													!formData.location_country
												}
												required={
													State.getStatesOfCountry(
														formData.location_country
													).length > 0
												}
											>
												<option value="">
													{formData.location_country
														? "Select state / province"
														: "Select country first"}
												</option>
												{State.getStatesOfCountry(
													formData.location_country
												).map((s) => (
													<option
														key={s.isoCode}
														value={s.isoCode}
													>
														{s.name}
													</option>
												))}
											</select>
										</div>
									</div>

									<div className="form-group">
										<label htmlFor="location_city">
											City *
										</label>
										<select
											id="location_city"
											name="location_city"
											className="input-field"
											value={formData.location_city}
											onChange={handleChange}
											disabled={
												!formData.location_country ||
												(!formData.location_state &&
													State.getStatesOfCountry(
														formData.location_country
													).length > 0)
											}
											required
										>
											<option value="">
												{!formData.location_country
													? "Select country first"
													: State.getStatesOfCountry(
															formData.location_country
														).length > 0 &&
													  !formData.location_state
													? "Select state first"
													: "Select city"}
											</option>
											{(() => {
												const states = State.getStatesOfCountry(
													formData.location_country
												);
												const cities =
													states.length > 0 &&
													formData.location_state
														? City.getCitiesOfState(
																formData.location_country,
																formData.location_state
															)
														: formData.location_country
														? City.getCitiesOfCountry(
																formData.location_country
															) || []
														: [];
												return cities.map((c) => (
													<option
														key={c.name}
														value={c.name}
													>
														{c.name}
													</option>
												));
											})()}
										</select>
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
											Upload your resume to Google Drive
											or Dropbox and paste the link.
										</small>
									</div>
								</>
							)}

							{/* Step 2: Work eligibility */}
							{step === 2 && (
								<>
									<div className="form-group">
										<label>Work authorization *</label>
										<div className="radio-group">
											<button
												type="button"
												className={`chip-button ${
													formData.work_authorized ===
													true
														? "selected"
														: ""
												}`}
												onClick={() =>
													setFormData((prev) => ({
														...prev,
														work_authorized: true,
													}))
												}
											>
												Yes, I am authorized to work
												without restrictions
											</button>
											<button
												type="button"
												className={`chip-button ${
													formData.work_authorized ===
													false
														? "selected"
														: ""
												}`}
												onClick={() =>
													setFormData((prev) => ({
														...prev,
														work_authorized: false,
													}))
												}
											>
												No, I am not currently
												authorized
											</button>
										</div>
									</div>

									<div className="form-group">
										<label>
											Will you require visa sponsorship
											now or in the future? *
										</label>
										<div className="radio-group">
											<button
												type="button"
												className={`chip-button ${
													formData.sponsorship_needed ===
													true
														? "selected"
														: ""
												}`}
												onClick={() =>
													setFormData((prev) => ({
														...prev,
														sponsorship_needed: true,
													}))
												}
											>
												Yes, I will need sponsorship
											</button>
											<button
												type="button"
												className={`chip-button ${
													formData.sponsorship_needed ===
													false
														? "selected"
														: ""
												}`}
												onClick={() =>
													setFormData((prev) => ({
														...prev,
														sponsorship_needed: false,
													}))
												}
											>
												No, I will not need
												sponsorship
											</button>
										</div>
									</div>
								</>
							)}

							{/* Step 3: Links + experience/education */}
							{step === 3 && (
								<>
									<div className="form-group">
										<label htmlFor="skills">
											Skills (comma-separated, optional)
										</label>
										<input
											type="text"
											id="skills"
											name="skills"
											className="input-field"
											placeholder="React, TypeScript, GraphQL"
											value={formData.skills}
											onChange={handleChange}
										/>
									</div>

									<div className="form-group">
										<label htmlFor="linkedin_url">
											<Globe size={18} />
											LinkedIn URL (recommended)
										</label>
										<input
											type="url"
											id="linkedin_url"
											name="linkedin_url"
											className="input-field"
											placeholder="https://linkedin.com/in/username"
											value={formData.linkedin_url}
											onChange={handleChange}
										/>
									</div>

									<div className="form-group">
										<label htmlFor="github_url">
											<Github size={18} />
											GitHub URL
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
										<label htmlFor="portfolio_url">
											<Globe size={18} />
											Portfolio / Personal site
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
										<label htmlFor="leetcode_url">
											<Code2 size={18} />
											LeetCode URL (optional)
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

									<div className="form-section">
										<h3 className="form-section-title">
											Work Experience
										</h3>
										{formData.work_experiences.length ===
										0 ? (
											<p className="field-hint">
												Add your most relevant roles.
												You can always update these
												later.
											</p>
										) : null}
										<div className="experience-list">
											{formData.work_experiences.map(
												(exp, index) => (
													<div
														className="form-card"
														key={index}
													>
														<div className="form-row">
															<div className="form-group">
																<label
																	htmlFor={`exp_title_${index}`}
																>
																	Title
																</label>
																<input
																	type="text"
																	id={`exp_title_${index}`}
																	className="input-field"
																	placeholder="Software Engineer"
																	value={
																		exp.title
																	}
																	onChange={(
																		e
																	) =>
																		setFormData(
																			(
																				prev
																			) => {
																				const updated =
																					[
																						...prev.work_experiences,
																					];
																				updated[
																					index
																				] =
																					{
																						...updated[
																							index
																						],
																						title: e
																							.target
																							.value,
																					};
																				return {
																					...prev,
																					work_experiences:
																						updated,
																				};
																			}
																		)
																	}
																/>
															</div>
															<div className="form-group">
																<label
																	htmlFor={`exp_company_${index}`}
																>
																	Company
																</label>
																<input
																	type="text"
																	id={`exp_company_${index}`}
																	className="input-field"
																	placeholder="Acme Corp"
																	value={
																		exp.company
																	}
																	onChange={(
																		e
																	) =>
																		setFormData(
																			(
																				prev
																			) => {
																				const updated =
																					[
																						...prev.work_experiences,
																					];
																				updated[
																					index
																				] =
																					{
																						...updated[
																							index
																						],
																						company:
																							e
																								.target
																								.value,
																					};
																				return {
																					...prev,
																					work_experiences:
																						updated,
																				};
																			}
																		)
																	}
																/>
															</div>
														</div>

														<div className="form-row">
															<div className="form-group">
																<label
																	htmlFor={`exp_start_${index}`}
																>
																	Start date
																</label>
																<input
																	type="date"
																	id={`exp_start_${index}`}
																	className="input-field"
																	value={
																		exp.start_date ||
																		""
																	}
																	onChange={(
																		e
																	) =>
																		setFormData(
																			(
																				prev
																			) => {
																				const updated =
																					[
																						...prev.work_experiences,
																					];
																				updated[
																					index
																				] =
																					{
																						...updated[
																							index
																						],
																						start_date:
																							e
																								.target
																								.value,
																					};
																				return {
																					...prev,
																					work_experiences:
																						updated,
																				};
																			}
																		)
																	}
																/>
															</div>
															<div className="form-group">
																<label
																	htmlFor={`exp_end_${index}`}
																>
																	End date
																</label>
																<input
																	type="date"
																	id={`exp_end_${index}`}
																	className="input-field"
																	value={
																		exp.end_date ||
																		""
																	}
																	disabled={
																		exp.is_current
																	}
																	onChange={(
																		e
																	) =>
																		setFormData(
																			(
																				prev
																			) => {
																				const updated =
																					[
																						...prev.work_experiences,
																					];
																				updated[
																					index
																				] =
																					{
																						...updated[
																							index
																						],
																						end_date:
																							e
																								.target
																								.value,
																					};
																				return {
																					...prev,
																					work_experiences:
																						updated,
																				};
																			}
																		)
																	}
																/>
																<div className="field-hint">
																	<label
																		style={{
																			display:
																				"flex",
																			alignItems:
																				"center",
																			gap: "0.5rem",
																		}}
																	>
																		<input
																			type="checkbox"
																			checked={
																				!!exp.is_current
																			}
																			onChange={(
																				e
																			) =>
																				setFormData(
																					(
																						prev
																					) => {
																						const updated =
																							[
																								...prev.work_experiences,
																							];
																						updated[
																							index
																						] =
																							{
																								...updated[
																									index
																								],
																								is_current:
																									e
																										.target
																										.checked,
																							};
																						return {
																							...prev,
																							work_experiences:
																								updated,
																						};
																					}
																				)
																			}
																		/>
																		<span>
																			Currently
																			working
																			here
																		</span>
																	</label>
																</div>
															</div>
														</div>

														<div className="form-group">
															<label
																htmlFor={`exp_desc_${index}`}
															>
																Job description
															</label>
															<textarea
																id={`exp_desc_${index}`}
																className="input-field"
																rows="3"
																placeholder="Briefly describe what you worked on..."
																value={
																	exp.description
																}
																onChange={(e) =>
																	setFormData(
																		(
																			prev
																		) => {
																			const updated =
																				[
																					...prev.work_experiences,
																				];
																			updated[
																				index
																			] = {
																				...updated[
																					index
																				],
																				description:
																					e
																						.target
																						.value,
																			};
																			return {
																				...prev,
																				work_experiences:
																					updated,
																			};
																		}
																	)
																}
															/>
														</div>

														<button
															type="button"
															className="btn btn-outline btn-sm"
															onClick={() =>
																setFormData(
																	(prev) => ({
																		...prev,
																		work_experiences:
																			prev.work_experiences.filter(
																				(
																					_,
																					i
																				) =>
																					i !==
																					index
																			),
																	})
																)
															}
														>
															Remove
														</button>
													</div>
												)
											)}
										</div>
										<button
											type="button"
											className="btn btn-outline btn-sm"
											onClick={() =>
												setFormData((prev) => ({
													...prev,
													work_experiences: [
														...prev.work_experiences,
														{
															title: "",
															company: "",
															start_date: "",
															end_date: "",
															is_current: false,
															description: "",
														},
													],
												}))
											}
										>
											Add Work Experience
										</button>
									</div>

									<div className="form-section">
										<h3 className="form-section-title">
											Education
										</h3>
										{formData.educations.length === 0 ? (
											<p className="field-hint">
												Add your highest or most
												recent education.
											</p>
										) : null}
										<div className="experience-list">
											{formData.educations.map(
												(edu, index) => (
													<div
														className="form-card"
														key={index}
													>
														<div className="form-row">
															<div className="form-group">
																<label
																	htmlFor={`edu_school_${index}`}
																>
																	School /
																	University
																</label>
																<input
																	type="text"
																	id={`edu_school_${index}`}
																	className="input-field"
																	placeholder="IIT Bombay"
																	value={
																		edu.school
																	}
																	onChange={(
																		e
																	) =>
																		setFormData(
																			(
																				prev
																			) => {
																				const updated =
																					[
																						...prev.educations,
																					];
																				updated[
																					index
																				] =
																					{
																						...updated[
																							index
																						],
																						school:
																							e
																								.target
																								.value,
																					};
																				return {
																					...prev,
																					educations:
																						updated,
																				};
																			}
																		)
																	}
																/>
															</div>
															<div className="form-group">
																<label
																	htmlFor={`edu_degree_${index}`}
																>
																	Degree
																</label>
																<input
																	type="text"
																	id={`edu_degree_${index}`}
																	className="input-field"
																	placeholder="B.Tech in Computer Science"
																	value={
																		edu.degree
																	}
																	onChange={(
																		e
																	) =>
																		setFormData(
																			(
																				prev
																			) => {
																				const updated =
																					[
																						...prev.educations,
																					];
																				updated[
																					index
																				] =
																					{
																						...updated[
																							index
																						],
																						degree:
																							e
																								.target
																								.value,
																					};
																				return {
																					...prev,
																					educations:
																						updated,
																				};
																			}
																		)
																	}
																/>
															</div>
														</div>

														<div className="form-group">
															<label
																htmlFor={`edu_grad_${index}`}
															>
																Graduation
																year (optional)
															</label>
															<input
																type="number"
																id={`edu_grad_${index}`}
																className="input-field"
																min="1950"
																max="2100"
																placeholder="2024"
																value={
																	edu.graduation_year ||
																	""
																}
																onChange={(e) =>
																	setFormData(
																		(
																			prev
																		) => {
																			const updated =
																				[
																					...prev.educations,
																				];
																			updated[
																				index
																			] = {
																				...updated[
																					index
																				],
																				graduation_year:
																					e
																						.target
																						.value,
																			};
																			return {
																				...prev,
																				educations:
																					updated,
																			};
																		}
																	)
																}
															/>
														</div>

														<button
															type="button"
															className="btn btn-outline btn-sm"
															onClick={() =>
																setFormData(
																	(prev) => ({
																		...prev,
																		educations:
																			prev.educations.filter(
																				(
																					_,
																					i
																				) =>
																					i !==
																					index
																			),
																	})
																)
															}
														>
															Remove
														</button>
													</div>
												)
											)}
										</div>
										<button
											type="button"
											className="btn btn-outline btn-sm"
											onClick={() =>
												setFormData((prev) => ({
													...prev,
													educations: [
														...prev.educations,
														{
															school: "",
															degree: "",
															graduation_year: "",
														},
													],
												}))
											}
										>
											Add Education
										</button>
									</div>

									<div className="form-group">
										<label htmlFor="profile_summary">
											<FileText size={18} />
											Short summary (optional)
										</label>
										<textarea
											id="profile_summary"
											name="profile_summary"
											className="input-field"
											rows="4"
											placeholder="Tell us about your focus, strengths, and what you're looking for..."
											value={formData.profile_summary}
											onChange={handleChange}
										/>
									</div>

									<div className="form-group">
										<label htmlFor="status">
											Current job search status
										</label>
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
											<option value="not_looking">
												Not Looking
											</option>
										</select>
									</div>
								</>
							)}

							{/* Step 4: Demographics (optional) */}
							{step === 4 && (
								<>
									<p className="field-hint">
										Optional. Used for equal opportunity
										reporting and to help us measure
										fairness. This information is not shared
										with employers in a way that identifies
										you.
									</p>

									<div className="form-group">
										<label htmlFor="demographics_race_ethnicity">
											Race / Ethnicity
										</label>
										<select
											id="demographics_race_ethnicity"
											name="demographics_race_ethnicity"
											className="input-field"
											value={
												formData.demographics_race_ethnicity
											}
											onChange={handleChange}
										>
											<option value="">
												Prefer not to say
											</option>
											<option value="asian">Asian</option>
											<option value="black_or_african_american">
												Black or African American
											</option>
											<option value="hispanic_or_latino">
												Hispanic or Latino
											</option>
											<option value="white">White</option>
											<option value="middle_eastern_or_north_african">
												Middle Eastern or North African
											</option>
											<option value="native_american_or_alaska_native">
												Native American or Alaska
												Native
											</option>
											<option value="native_hawaiian_or_pacific_islander">
												Native Hawaiian or Other
												Pacific Islander
											</option>
											<option value="two_or_more">
												Two or more races
											</option>
											<option value="other">Other</option>
										</select>
									</div>

									<div className="form-group">
										<label htmlFor="demographics_gender">
											Gender
										</label>
										<select
											id="demographics_gender"
											name="demographics_gender"
											className="input-field"
											value={formData.demographics_gender}
											onChange={handleChange}
										>
											<option value="">
												Prefer not to say
											</option>
											<option value="female">Female</option>
											<option value="male">Male</option>
											<option value="non_binary">
												Non-binary
											</option>
											<option value="other">Other</option>
										</select>
									</div>

									<div className="form-group">
										<label htmlFor="demographics_disability">
											Disability
										</label>
										<select
											id="demographics_disability"
											name="demographics_disability"
											className="input-field"
											value={
												formData.demographics_disability
											}
											onChange={handleChange}
										>
											<option value="">
												Prefer not to say
											</option>
											<option value="yes">
												Yes, I have a disability
											</option>
											<option value="no">
												No, I do not have a disability
											</option>
										</select>
									</div>
								</>
							)}

							<div className="onboarding-actions">
								{step > 1 && (
									<button
										type="button"
										className="btn btn-outline"
										onClick={handleBack}
										disabled={loading}
									>
										Back
									</button>
								)}

								{step < 4 && (
									<button
										type="button"
										className="btn btn-primary"
										onClick={handleNext}
										disabled={loading}
									>
										Next
									</button>
								)}

								{step === 4 && (
									<div className="onboarding-final-actions">
										<button
											type="button"
											className="btn btn-outline"
											onClick={() => {
												// Clear demographics and submit
												setFormData((prev) => ({
													...prev,
													demographics_race_ethnicity:
														"",
													demographics_gender: "",
													demographics_disability: "",
												}));
												handleSubmit(
													// synthetic event
													{ preventDefault: () => {} }
												);
											}}
											disabled={loading}
										>
											Skip this step
										</button>
										<button
											type="submit"
											className="btn btn-primary"
											disabled={loading}
										>
											{loading
												? "Creating Profile..."
												: "Complete Profile"}
										</button>
									</div>
								)}
							</div>
						</form>
					</div>
			</div>
		</div>
	);
};

export default CandidateOnboarding;
