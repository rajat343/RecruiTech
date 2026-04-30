import { useState } from "react";
import {
	CheckCircle,
	XCircle,
	AlertTriangle,
	Target,
	Star,
} from "lucide-react";
import {
	Radar,
	RadarChart,
	PolarGrid,
	PolarAngleAxis,
	PolarRadiusAxis,
	ResponsiveContainer,
	Tooltip,
} from "recharts";

// ── colour helpers ──────────────────────────────────────────────────────
const scoreColor = (v) => (v >= 75 ? "#1D9E75" : v >= 50 ? "#EF9F27" : "#E24B4A");
const fitBadge = (level) => {
	const m = { Strong: "#1D9E75", Moderate: "#EF9F27", Weak: "#E24B4A" };
	return m[level] || m.Moderate;
};

// ── tiny sub-components ─────────────────────────────────────────────────
const ScoreRing = ({ score, size = 96 }) => {
	const r = (size - 10) / 2;
	const circ = 2 * Math.PI * r;
	const offset = circ - (Math.min(score, 100) / 100) * circ;
	const c = scoreColor(score);
	return (
		<svg width={size} height={size} style={{ flexShrink: 0 }}>
			<circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
			<circle
				cx={size / 2} cy={size / 2} r={r} fill="none" stroke={c} strokeWidth={6}
				strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
				transform={`rotate(-90 ${size / 2} ${size / 2})`}
				style={{ transition: "stroke-dashoffset 0.8s ease" }}
			/>
			<text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
				style={{ fontSize: "1.6rem", fontWeight: 700, fill: c }}
			>
				{Math.round(score)}
			</text>
		</svg>
	);
};

const ProgressBar = ({ value, label, showValue = true }) => {
	const c = scoreColor(value);
	return (
		<div style={{ marginBottom: "0.55rem" }}>
			<div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem", marginBottom: "0.25rem" }}>
				<span style={{ color: "var(--text-secondary)", textTransform: "capitalize" }}>{label}</span>
				{showValue && <span style={{ color: c, fontWeight: 600 }}>{Math.round(value)}</span>}
			</div>
			<div style={{ height: "8px", borderRadius: "4px", background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
				<div style={{
					height: "100%", borderRadius: "4px", width: `${Math.min(100, value)}%`,
					background: c, transition: "width 0.6s ease",
				}} />
			</div>
		</div>
	);
};

const Pill = ({ text, color = "#1D9E75", variant = "filled" }) => {
	const isFilled = variant === "filled";
	return (
		<span style={{
			display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "1rem",
			fontSize: "0.78rem", fontWeight: 600, marginRight: "0.35rem", marginBottom: "0.35rem",
			background: isFilled ? `${color}18` : "transparent",
			color, border: isFilled ? `1px solid ${color}30` : `1px solid ${color}55`,
		}}>
			{text}
		</span>
	);
};

const Card = ({ children, style }) => (
	<div style={{
		background: "var(--bg-dark)", border: "1px solid var(--border)",
		borderRadius: "0.75rem", padding: "1.25rem", ...style,
	}}>
		{children}
	</div>
);

const SectionTitle = ({ children, color }) => (
	<h4 style={{ margin: "0 0 0.75rem 0", fontSize: "1.05rem", color: color || "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
		{children}
	</h4>
);

const BulletList = ({ items, icon: Icon, color }) => (
	<div>
		{items.map((item, i) => (
			<div key={i} style={{ display: "flex", gap: "0.4rem", marginBottom: "0.35rem", fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.55 }}>
				<Icon size={14} style={{ color, marginTop: "0.2rem", flexShrink: 0 }} />
				<span>{item}</span>
			</div>
		))}
	</div>
);

// ── helpers ──────────────────────────────────────────────────────────────
const agentLabel = {
	ats_scorer: "ATS Resume Score",
	github_analyzer: "GitHub Analysis",
	leetcode_analyzer: "LeetCode Analysis",
};
const catLabel = (name) =>
	name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const getAgent = (results, name) => results?.find((a) => a.agent_name === name);

// ── priority colouring for interview focus ──────────────────────────────
const priorityDot = (idx) => {
	const colors = ["#E24B4A", "#EF9F27", "#3B82F6"];
	return colors[Math.min(idx, colors.length - 1)];
};

// ── custom radar tooltip ────────────────────────────────────────────────
const RadarTooltip = ({ active, payload }) => {
	if (!active || !payload?.length) return null;
	const d = payload[0].payload;
	return (
		<div style={{
			background: "var(--bg-dark)", border: "1px solid var(--border)",
			borderRadius: "0.5rem", padding: "0.6rem 0.8rem", maxWidth: "260px",
			fontSize: "0.82rem", lineHeight: 1.5,
		}}>
			<div style={{ fontWeight: 700, color: scoreColor(d.value), marginBottom: "0.2rem" }}>
				{d.subject}: {d.value}/100
			</div>
			{d.rationale && (
				<div style={{ color: "var(--text-secondary)" }}>{d.rationale}</div>
			)}
		</div>
	);
};

// =====================================================================
// MAIN COMPONENT
// =====================================================================
const AIAnalysisReport = ({ data, candidate, appId, onAction, statusUpdating }) => {
	if (!data) return null;

	const ats = getAgent(data.agent_results, "ats_scorer");
	const github = getAgent(data.agent_results, "github_analyzer");
	const leetcode = getAgent(data.agent_results, "leetcode_analyzer");

	// Build radar data from dimension_scores (cross-agent unified dimensions)
	const radarData = (data.dimension_scores || []).map((ds) => ({
		subject: ds.dimension,
		value: Math.round(ds.score),
		rationale: ds.rationale || "",
		fullMark: 100,
	}));

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", fontSize: "0.95rem" }}>

			{/* ── 1. HEADER ─────────────────────────────────────── */}
			<Card style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
				<ScoreRing score={data.final_score} />
				<div style={{ flex: 1, minWidth: "180px" }}>
					<div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap", marginBottom: "0.35rem" }}>
						<h3 style={{ margin: 0, fontSize: "1.3rem" }}>
							{candidate?.first_name} {candidate?.last_name}
						</h3>
						<span style={{
							padding: "0.2rem 0.75rem", borderRadius: "1rem", fontSize: "0.85rem", fontWeight: 600,
							background: `${fitBadge(data.fit_level)}18`, color: fitBadge(data.fit_level),
							border: `1px solid ${fitBadge(data.fit_level)}30`,
						}}>
							{data.fit_level} Fit
						</span>
					</div>
				</div>
				<div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
					<button
						className="btn btn-sm"
						style={{ background: "rgba(29,158,117,0.12)", color: "#1D9E75", border: "1px solid rgba(29,158,117,0.3)", padding: "0.45rem 1rem", fontSize: "0.88rem" }}
						onClick={() => onAction("accept")}
						disabled={statusUpdating === appId}
					>
						<Star size={15} /> Shortlist
					</button>
					<button
						className="btn btn-sm"
						style={{ background: "rgba(226,75,74,0.12)", color: "#E24B4A", border: "1px solid rgba(226,75,74,0.3)", padding: "0.45rem 1rem", fontSize: "0.88rem" }}
						onClick={() => onAction("reject")}
						disabled={statusUpdating === appId}
					>
						<XCircle size={15} /> Reject
					</button>
				</div>
			</Card>

			{/* ── 2. RADAR CHART (dimension_scores) ───────────────── */}
			{radarData.length >= 3 && (
				<Card style={{ padding: "1rem 0.5rem 0.5rem" }}>
					<h4 style={{ margin: "0 0 0.25rem 1rem", fontSize: "1.05rem" }}>Candidate Dimensions</h4>
					<ResponsiveContainer width="100%" height={320}>
						<RadarChart data={radarData} cx="50%" cy="50%" outerRadius="68%">
							<PolarGrid stroke="rgba(255,255,255,0.08)" />
							<PolarAngleAxis
								dataKey="subject"
								tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
							/>
							<PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
							<Radar
								dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2}
								dot={{ r: 4, fill: "#8b5cf6", stroke: "#8b5cf6" }}
							/>
							<Tooltip content={<RadarTooltip />} />
						</RadarChart>
					</ResponsiveContainer>
				</Card>
			)}

			{/* ── 3. SUMMARY ────────────────────────────────────── */}
			{data.summary && (
				<Card>
					<SectionTitle>Summary</SectionTitle>
					<p style={{ margin: 0, fontSize: "0.95rem", lineHeight: 1.7, color: "var(--text-secondary)" }}>
						{data.summary}
					</p>
				</Card>
			)}

			{/* ── 4. STRENGTHS + CONCERNS ───────────────────────── */}
			<div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
				{(data.top_strengths?.length > 0 || data.strength_tags?.length > 0) && (
					<Card style={{ flex: 1, minWidth: "260px" }}>
						<SectionTitle color="#1D9E75"><CheckCircle size={18} /> Top Strengths</SectionTitle>
						{data.strength_tags?.length > 0 && (
							<div style={{ marginBottom: "0.75rem" }}>
								{data.strength_tags.map((tag, i) => (
									<Pill key={i} text={tag} color="#1D9E75" />
								))}
							</div>
						)}
						{data.top_strengths?.length > 0 && (
							<BulletList items={data.top_strengths} icon={CheckCircle} color="#1D9E75" />
						)}
					</Card>
				)}
				{(data.key_concerns?.length > 0 || data.concern_tags?.length > 0) && (
					<Card style={{ flex: 1, minWidth: "260px" }}>
						<SectionTitle color="#E24B4A"><AlertTriangle size={18} /> Key Concerns</SectionTitle>
						{data.concern_tags?.length > 0 && (
							<div style={{ marginBottom: "0.75rem" }}>
								{data.concern_tags.map((ct, i) => (
									<Pill
										key={i}
										text={ct.label}
										color={ct.severity === "critical" ? "#E24B4A" : "#EF9F27"}
									/>
								))}
							</div>
						)}
						{data.key_concerns?.length > 0 && (
							<BulletList items={data.key_concerns} icon={AlertTriangle} color="#E24B4A" />
						)}
					</Card>
				)}
			</div>

			{/* ── 5. INTERVIEW FOCUS AREAS ──────────────────────── */}
			{data.interview_focus_areas?.length > 0 && (
				<Card>
					<SectionTitle color="#8b5cf6"><Target size={18} /> Interview Focus Areas</SectionTitle>
					{data.interview_focus_areas.map((area, i) => (
						<div key={i} style={{ display: "flex", gap: "0.6rem", marginBottom: "0.45rem", fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.55 }}>
							<span style={{
								width: "10px", height: "10px", borderRadius: "50%", marginTop: "0.3rem", flexShrink: 0,
								background: priorityDot(i),
							}} />
							<span>{area}</span>
						</div>
					))}
					<div style={{ display: "flex", gap: "1.25rem", marginTop: "0.75rem", fontSize: "0.78rem", color: "var(--text-secondary)" }}>
						<span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
							<span style={{ width: 8, height: 8, borderRadius: "50%", background: "#E24B4A" }} /> Critical gap
						</span>
						<span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
							<span style={{ width: 8, height: 8, borderRadius: "50%", background: "#EF9F27" }} /> Verify depth
						</span>
						<span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
							<span style={{ width: 8, height: 8, borderRadius: "50%", background: "#3B82F6" }} /> Explore
						</span>
					</div>
				</Card>
			)}

			{/* ── 6. ATS RESUME SCORE ──────────────────────────── */}
			{ats && <AgentCard agent={ats} label={agentLabel.ats_scorer} />}

			{/* ── 7. GITHUB ANALYSIS ───────────────────────────── */}
			{github && <AgentCard agent={github} label={agentLabel.github_analyzer} />}

			{/* ── 8. LEETCODE ANALYSIS ─────────────────────────── */}
			{leetcode && <AgentCard agent={leetcode} label={agentLabel.leetcode_analyzer} showWeight />}
		</div>
	);
};

// =====================================================================
// AGENT CARD — reusable for ATS / GitHub / LeetCode
// =====================================================================
const AgentCard = ({ agent, label, showWeight }) => {
	const [showEvidence, setShowEvidence] = useState(false);
	if (!agent) return null;
	const sc = Math.round(agent.overall_score);
	const hasEvidence = agent.category_scores?.some((cat) => cat.evidence?.length > 0);

	return (
		<Card>
			{/* header row */}
			<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
				<SectionTitle>{label}</SectionTitle>
				<div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
					{showWeight && (
						<span style={{
							fontSize: "0.78rem", padding: "0.15rem 0.55rem", borderRadius: "0.75rem",
							background: "rgba(139,92,246,0.12)", color: "#8b5cf6", border: "1px solid rgba(139,92,246,0.3)",
						}}>
							25% weight
						</span>
					)}
					<span style={{ fontSize: "1.25rem", fontWeight: 700, color: scoreColor(sc) }}>{sc}/100</span>
				</div>
			</div>

			{/* sub-score bars */}
			{agent.category_scores?.map((cat) => (
				<ProgressBar key={cat.category} value={cat.score} label={catLabel(cat.category)} />
			))}

			{/* strengths vs weaknesses */}
			{(agent.strengths?.length > 0 || agent.weaknesses?.length > 0) && (
				<div style={{ display: "flex", gap: "1.25rem", marginTop: "0.9rem", flexWrap: "wrap" }}>
					{agent.strengths?.length > 0 && (
						<div style={{ flex: 1, minWidth: "200px" }}>
							<p style={{ fontSize: "0.85rem", fontWeight: 600, color: "#1D9E75", margin: "0 0 0.35rem 0" }}>Strengths</p>
							<BulletList items={agent.strengths} icon={CheckCircle} color="#1D9E75" />
						</div>
					)}
					{agent.weaknesses?.length > 0 && (
						<div style={{ flex: 1, minWidth: "200px" }}>
							<p style={{ fontSize: "0.85rem", fontWeight: 600, color: "#E24B4A", margin: "0 0 0.35rem 0" }}>Weaknesses</p>
							<BulletList items={agent.weaknesses} icon={XCircle} color="#E24B4A" />
						</div>
					)}
				</div>
			)}

			{/* collapsible evidence / more info */}
			{hasEvidence && (
				<div style={{ marginTop: "0.9rem", paddingTop: "0.9rem", borderTop: "1px solid var(--border)" }}>
					<div
						onClick={() => setShowEvidence((v) => !v)}
						style={{
							fontSize: "0.95rem", fontWeight: 700, color: "var(--text-secondary)", cursor: "pointer",
							userSelect: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
						}}
					>
						{showEvidence ? "Less Info \u25BE" : "More Info \u25B8"}
					</div>
					{showEvidence && (
						<div style={{ marginTop: "0.6rem" }}>
							{agent.category_scores.filter((cat) => cat.evidence?.length > 0).map((cat) => (
								<div key={cat.category} style={{ marginBottom: "0.6rem" }}>
									<p style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", margin: "0 0 0.25rem 0", textTransform: "capitalize" }}>
										{catLabel(cat.category)}
									</p>
									{cat.evidence.map((ev, j) => (
										<div key={j} style={{ display: "flex", gap: "0.4rem", marginBottom: "0.2rem", paddingLeft: "0.5rem", fontSize: "0.85rem", color: "var(--text-primary)", lineHeight: 1.5 }}>
											<span style={{ flexShrink: 0 }}>&bull;</span>
											<span>{ev}</span>
										</div>
									))}
								</div>
							))}
						</div>
					)}
				</div>
			)}
		</Card>
	);
};

export default AIAnalysisReport;
