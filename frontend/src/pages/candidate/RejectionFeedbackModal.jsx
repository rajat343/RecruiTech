import { X, TrendingUp, CheckCircle, ArrowRight, Sparkles, BookOpen } from "lucide-react";
import "./RejectionFeedbackModal.css";

const RejectionFeedbackModal = ({ feedback, onClose, jobTitle }) => {
	if (!feedback) return null;

	const { status, feedback: content } = feedback;

	return (
		<div className="modal-overlay" onClick={onClose}>
			<div
				className="modal-content modal-large feedback-modal"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="modal-header">
					<h2>
						<TrendingUp size={22} style={{ color: "var(--accent-cyan)", marginRight: "0.5rem" }} />
						Growth Insights
					</h2>
					<button className="modal-close" onClick={onClose}>
						<X size={24} />
					</button>
				</div>

				<div className="modal-body">
					{jobTitle && (
						<p className="feedback-job-title">
							Feedback for: <span>{jobTitle}</span>
						</p>
					)}

					{/* Generating state */}
					{status === "generating" && (
						<div className="feedback-generating">
							<div className="spinner"></div>
							<h3>Preparing Your Personalized Feedback</h3>
							<p>
								Our AI is analyzing your profile and preparing tailored growth
								insights. This usually completes within a few minutes — check
								back shortly.
							</p>
						</div>
					)}

					{/* Failed state */}
					{status === "failed" && (
						<div className="feedback-generating">
							<h3>Feedback Unavailable</h3>
							<p>
								We were unable to generate feedback for this application.
								Please try again later or contact support if the issue persists.
							</p>
						</div>
					)}

					{/* Ready state — full feedback */}
					{status === "ready" && content && (
						<div className="feedback-content">
							{/* Summary */}
							<div className="feedback-summary">
								<p>{content.summary}</p>
							</div>

							{/* Strengths */}
							{content.strengths?.length > 0 && (
								<div className="feedback-section">
									<h3 className="feedback-section-title feedback-strengths-title">
										<CheckCircle size={18} />
										What You're Doing Well
									</h3>
									<ul className="feedback-strengths-list">
										{content.strengths.map((s, i) => (
											<li key={i}>{s}</li>
										))}
									</ul>
								</div>
							)}

							{/* Growth Areas */}
							{content.growth_areas?.length > 0 && (
								<div className="feedback-section">
									<h3 className="feedback-section-title feedback-growth-title">
										<BookOpen size={18} />
										Areas to Explore
									</h3>
									<div className="feedback-growth-cards">
										{content.growth_areas.map((ga, i) => (
											<div className="feedback-growth-card" key={i}>
												<div className="feedback-growth-header">
													<span className="feedback-growth-area">{ga.area}</span>
													{ga.current_level && (
														<span className="feedback-growth-level">{ga.current_level}</span>
													)}
												</div>
												<p className="feedback-growth-suggestion">{ga.suggestion}</p>
												{ga.resources && (
													<p className="feedback-growth-resources">
														<Sparkles size={14} />
														{ga.resources}
													</p>
												)}
											</div>
										))}
									</div>
								</div>
							)}

							{/* Next Steps */}
							{content.next_steps?.length > 0 && (
								<div className="feedback-section">
									<h3 className="feedback-section-title feedback-steps-title">
										<ArrowRight size={18} />
										Recommended Next Steps
									</h3>
									<ol className="feedback-steps-list">
										{content.next_steps.map((step, i) => (
											<li key={i}>{step}</li>
										))}
									</ol>
								</div>
							)}

							{/* Encouragement */}
							{content.encouragement && (
								<div className="feedback-encouragement">
									<p>{content.encouragement}</p>
								</div>
							)}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default RejectionFeedbackModal;
