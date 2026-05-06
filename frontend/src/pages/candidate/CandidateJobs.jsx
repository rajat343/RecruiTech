import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { graphqlRequest } from "../../utils/graphql";
import {
  Search,
  MapPin,
  Briefcase,
  Clock,
  Building2,
  CheckCircle,
  Send,
  X,
  Filter,
  Loader,
  Video,
  Shield,
} from "lucide-react";
import "./CandidateJobs.css";
import "./CandidateHome.css";

const PAGE_SIZE = 15;

const JOBS_SEARCH_STORAGE_KEY = "recruitech_candidate_jobs_search_v1";

function loadPersistedSearchState() {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(JOBS_SEARCH_STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p || typeof p !== "object") return null;
    if (!Array.isArray(p.jobs)) p.jobs = [];
    if (typeof p.total !== "number") p.total = p.jobs.length;
    if (typeof p.offset !== "number") p.offset = p.jobs.length;
    return p;
  } catch {
    return null;
  }
}

function savePersistedSearchState(payload) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(JOBS_SEARCH_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

const formatSalary = (min, max, currency = "USD") => {
  const fmt = (n) => {
    if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
    return n.toString();
  };
  if (!min && !max) return null;
  const parts = [];
  if (min) parts.push(fmt(min));
  if (max) parts.push(fmt(max));
  return `${currency} ${parts.join(" - ")}`;
};

const formatEmploymentType = (t) =>
  t
    ? t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "";

const SEARCH_JOBS_QUERY = `
  query SearchJobs($filters: JobSearchInput, $limit: Int, $offset: Int) {
    searchJobs(filters: $filters, limit: $limit, offset: $offset) {
      total
      jobs {
        id
        title
        description
        employment_type
        experience_level
        location_type
        location
        salary_min
        salary_max
        salary_currency
        skills
        company_name
        createdAt
        sponsorship_available
      }
    }
  }
`;

const CandidateJobs = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  const initialPersisted = useMemo(() => loadPersistedSearchState(), []);

  const [jobs, setJobs] = useState(() => initialPersisted?.jobs ?? []);
  const [total, setTotal] = useState(() => initialPersisted?.total ?? 0);
  const [loading, setLoading] = useState(
    () => !(initialPersisted?.jobs && initialPersisted.jobs.length > 0)
  );
  const [loadingMore, setLoadingMore] = useState(false);

  // UI-bound filter inputs
  const [searchInput, setSearchInput] = useState(
    () => initialPersisted?.searchInput ?? ""
  );
  const [employmentType, setEmploymentType] = useState(
    () => initialPersisted?.employmentType ?? ""
  );
  const [experienceLevel, setExperienceLevel] = useState(
    () => initialPersisted?.experienceLevel ?? ""
  );
  const [locationType, setLocationType] = useState(
    () => initialPersisted?.locationType ?? ""
  );

  // The "committed" filters that actually trigger a fetch.
  // Bumping `version` forces a re-fetch even if filters haven't changed.
  const [activeFilters, setActiveFilters] = useState(
    () =>
      initialPersisted?.activeFilters ?? {
        search: "",
        employment_type: "",
        experience_level: "",
        location_type: "",
        version: 0,
      }
  );

  const [appliedJobs, setAppliedJobs] = useState(new Set());
  const [applicationMap, setApplicationMap] = useState({});
  const [interviewByApplicationId, setInterviewByApplicationId] = useState({});

  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyingJob, setApplyingJob] = useState(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyError, setApplyError] = useState(null);
  const [applySuccess, setApplySuccess] = useState(false);

  const offsetRef = useRef(initialPersisted?.offset ?? 0);
  const jobsRef = useRef(jobs);
  jobsRef.current = jobs;

  /** Hide applied roles unless this search hit includes an AI interview invite for that application. */
  const visibleJobs = useMemo(
    () =>
      jobs.filter((job) => {
        if (!appliedJobs.has(job.id)) return true;
        const appId = applicationMap[job.id];
        return !!(appId && interviewByApplicationId[appId]);
      }),
    [jobs, appliedJobs, applicationMap, interviewByApplicationId]
  );

  const refreshAppliedAndInterviews = useCallback(async () => {
    if (!token) return;
    try {
      const [appsData, ivData] = await Promise.all([
        graphqlRequest(
          `query { myApplications(limit: 200) { id job_id } }`,
          {},
          token
        ),
        graphqlRequest(
          `query JobsSearchMyInterviews {
            myInterviews {
              id
              application_id
              interview_token
              status
              overall_score
              results_released
            }
          }`,
          {},
          token
        ),
      ]);
      const apps = appsData.myApplications || [];
      setAppliedJobs(new Set(apps.map((a) => a.job_id)));
      const amap = {};
      apps.forEach((a) => {
        amap[a.job_id] = a.id;
      });
      setApplicationMap(amap);
      const list = ivData.myInterviews || [];
      const imap = {};
      list.forEach((iv) => {
        imap[iv.application_id] = iv;
      });
      setInterviewByApplicationId(imap);
    } catch {
      /* profile may be missing */
    }
  }, [token]);

  // Commit current UI inputs into activeFilters (triggers the fetch effect)
  const commitFilters = () => {
    setActiveFilters((prev) => ({
      search: searchInput.trim(),
      employment_type: employmentType,
      experience_level: experienceLevel,
      location_type: locationType,
      version: prev.version + 1,
    }));
  };

  // Single effect that fetches jobs whenever activeFilters changes
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    const doFetch = async () => {
      const showFullSpinner = jobsRef.current.length === 0;
      if (showFullSpinner) setLoading(true);
      try {
        const filters = {};
        if (activeFilters.search) filters.search = activeFilters.search;
        if (activeFilters.employment_type) filters.employment_type = activeFilters.employment_type;
        if (activeFilters.experience_level) filters.experience_level = activeFilters.experience_level;
        if (activeFilters.location_type) filters.location_type = activeFilters.location_type;

        const hasSearch = Object.keys(filters).length > 0;

        const data = await graphqlRequest(
          SEARCH_JOBS_QUERY,
          { filters: hasSearch ? filters : null, limit: PAGE_SIZE, offset: 0 },
          token
        );

        if (cancelled) return;

        let resultJobs = data.searchJobs.jobs || [];

        // Client-side text filter as extra safety
        if (filters.search) {
          const tokens = filters.search.toLowerCase().split(/\s+/).filter(Boolean);
          if (tokens.length > 0) {
            resultJobs = resultJobs.filter((job) => {
              const haystack = `${job.title || ""} ${job.description || ""} ${job.location || ""}`.toLowerCase();
              return tokens.every((t) => haystack.includes(t));
            });
          }
        }

        setJobs(resultJobs);
        setTotal(filters.search ? resultJobs.length : data.searchJobs.total);
        offsetRef.current = resultJobs.length;

        if (!cancelled) {
          savePersistedSearchState({
            searchInput,
            employmentType,
            experienceLevel,
            locationType,
            activeFilters,
            jobs: resultJobs,
            total: filters.search ? resultJobs.length : data.searchJobs.total,
            offset: resultJobs.length,
          });
        }

        if (!cancelled) await refreshAppliedAndInterviews();
      } catch (err) {
        console.error("Error fetching jobs:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    doFetch();
    return () => { cancelled = true; };
  }, [activeFilters, token, refreshAppliedAndInterviews]);

  useEffect(() => {
    if (!token) return;
    refreshAppliedAndInterviews();
  }, [token, refreshAppliedAndInterviews]);

  const handleSearch = (e) => {
    e.preventDefault();
    commitFilters();
  };

  const handleDropdownChange = (setter) => (e) => {
    setter(e.target.value);
    // We need to commit with the NEW value. Since setState is async,
    // read the value directly and commit in a microtask.
    const newVal = e.target.value;
    setTimeout(() => {
      setActiveFilters((prev) => ({
        ...prev,
        search: searchInput.trim(),
        employment_type: setter === setEmploymentType ? newVal : employmentType,
        experience_level: setter === setExperienceLevel ? newVal : experienceLevel,
        location_type: setter === setLocationType ? newVal : locationType,
        version: prev.version + 1,
      }));
    }, 0);
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setEmploymentType("");
    setExperienceLevel("");
    setLocationType("");
    setActiveFilters((prev) => ({
      search: "",
      employment_type: "",
      experience_level: "",
      location_type: "",
      version: prev.version + 1,
    }));
  };

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      const filters = {};
      if (activeFilters.search) filters.search = activeFilters.search;
      if (activeFilters.employment_type) filters.employment_type = activeFilters.employment_type;
      if (activeFilters.experience_level) filters.experience_level = activeFilters.experience_level;
      if (activeFilters.location_type) filters.location_type = activeFilters.location_type;

      const hasSearch = Object.keys(filters).length > 0;

      const data = await graphqlRequest(
        SEARCH_JOBS_QUERY,
        { filters: hasSearch ? filters : null, limit: PAGE_SIZE, offset: offsetRef.current },
        token
      );

      const newJobs = data.searchJobs.jobs || [];
      setJobs((prev) => {
        const merged = [...prev, ...newJobs];
        offsetRef.current = merged.length;
        savePersistedSearchState({
          searchInput,
          employmentType,
          experienceLevel,
          locationType,
          activeFilters,
          jobs: merged,
          total,
          offset: merged.length,
        });
        return merged;
      });
    } catch (err) {
      console.error("Error loading more jobs:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleApplyClick = (job) => {
    setApplyingJob(job);
    setCoverLetter("");
    setResumeUrl("");
    setApplyError(null);
    setApplySuccess(false);
    setShowApplyModal(true);
  };

  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    setApplyLoading(true);
    setApplyError(null);

    try {
      await graphqlRequest(
        `
        mutation ApplyToJob($input: ApplyInput!) {
          applyToJob(input: $input) {
            id
            status
          }
        }
        `,
        {
          input: {
            job_id: applyingJob.id,
            cover_letter: coverLetter || null,
            resume_url: resumeUrl || null,
          },
        },
        token
      );

      setAppliedJobs((prev) => new Set([...prev, applyingJob.id]));
      await refreshAppliedAndInterviews();
      setApplySuccess(true);
    } catch (err) {
      setApplyError(err.message || "Failed to submit application");
    } finally {
      setApplyLoading(false);
    }
  };

  const handleCloseApplyModal = () => {
    setShowApplyModal(false);
    setApplyingJob(null);
    setApplySuccess(false);
  };

  const hasFilters = searchInput || employmentType || experienceLevel || locationType;

  return (
    <div className="jobs-page">
      <div className="container">
        <div className="jobs-header">
          <h1>Find Your Next Role</h1>
          <p>Browse open positions from top companies</p>
        </div>

        <div className="search-section">
          <form className="search-bar" onSubmit={handleSearch}>
            <div className="search-input-wrapper">
              <Search size={18} />
              <input
                type="text"
                className="input-field"
                placeholder="Search by job title, description, or location..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary">
              <Search size={18} />
              Search
            </button>
          </form>

          <div className="filters-row">
            <Filter size={16} style={{ color: "var(--text-secondary)" }} />
            <select
              className="input-field"
              value={employmentType}
              onChange={handleDropdownChange(setEmploymentType)}
            >
              <option value="">All Types</option>
              <option value="full_time">Full-time</option>
              <option value="part_time">Part-time</option>
              <option value="contract">Contract</option>
              <option value="internship">Internship</option>
              <option value="freelance">Freelance</option>
            </select>

            <select
              className="input-field"
              value={experienceLevel}
              onChange={handleDropdownChange(setExperienceLevel)}
            >
              <option value="">All Levels</option>
              <option value="junior">Junior</option>
              <option value="mid">Mid</option>
              <option value="senior">Senior</option>
              <option value="lead">Lead</option>
            </select>

            <select
              className="input-field"
              value={locationType}
              onChange={handleDropdownChange(setLocationType)}
            >
              <option value="">All Locations</option>
              <option value="remote">Remote</option>
              <option value="onsite">Onsite</option>
              <option value="hybrid">Hybrid</option>
            </select>

            {hasFilters && (
              <button className="clear-filters" onClick={handleClearFilters}>
                <X size={14} /> Clear
              </button>
            )}
          </div>
        </div>

        <div className="jobs-results-header">
          <span className="results-count">
            {loading
              ? "Searching..."
              : `${visibleJobs.length} job${visibleJobs.length !== 1 ? "s" : ""} open to apply`}
          </span>
        </div>

        {loading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Finding jobs for you...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="empty-state">
            <Briefcase size={48} />
            <h3>No jobs found</h3>
            <p>Try adjusting your search or filters</p>
          </div>
        ) : visibleJobs.length === 0 ? (
          <div className="empty-state">
            <CheckCircle size={48} style={{ color: "var(--accent-cyan, #22d3ee)" }} />
            <h3>You have applied to these listings</h3>
            <p>
              {jobs.length < total
                ? "Load more to see additional openings, or change your filters."
                : "There are no other openings in this list right now. Try a new search or check back later."}
            </p>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginTop: "0.5rem", maxWidth: "32rem" }}>
              Applied roles stay hidden unless you have an AI interview for that application—then they show
              again whenever this search matches.
            </p>
            {jobs.length < total && (
              <button
                type="button"
                className="btn btn-primary"
                style={{ marginTop: "1rem" }}
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <>
                    <Loader size={16} className="spin" /> Loading...
                  </>
                ) : (
                  "Load more jobs"
                )}
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="jobs-grid">
              {visibleJobs.map((job) => {
                const salary = formatSalary(
                  job.salary_min,
                  job.salary_max,
                  job.salary_currency
                );
                const isApplied = appliedJobs.has(job.id);
                const appId = applicationMap[job.id];
                const iv = appId ? interviewByApplicationId[appId] : null;

                return (
                  <div className="job-search-card" key={job.id}>
                    <div className="card-top">
                      <div className="card-top-left">
                        <div className="company-icon">
                          <Building2 size={22} />
                        </div>
                        <div className="card-info">
                          <h3
                            style={{ cursor: "pointer" }}
                            onClick={() => navigate(`/jobs/${job.id}`)}
                            title="View full job posting"
                          >
                            {job.title}
                          </h3>
                          <p className="company-line">
                            {job.company_name || "Company"} &bull; {job.location}
                          </p>
                        </div>
                      </div>
                      {salary && <span className="salary-badge">{salary}</span>}
                    </div>

                    <div className="card-meta">
                      <span className="meta-item">
                        <Briefcase size={14} />
                        {formatEmploymentType(job.employment_type)}
                      </span>
                      <span className="meta-item">
                        <Clock size={14} />
                        {job.experience_level?.charAt(0).toUpperCase() +
                          job.experience_level?.slice(1)}
                      </span>
                      <span className="meta-item">
                        <MapPin size={14} />
                        {job.location_type === "remote"
                          ? "Remote"
                          : job.location_type?.charAt(0).toUpperCase() +
                            job.location_type?.slice(1)}
                      </span>
                      {job.sponsorship_available && (
                        <span className="meta-item" title="Employer offers sponsorship">
                          <Shield size={14} />
                          Sponsorship
                        </span>
                      )}
                    </div>

                    <p className="card-desc">{job.description}</p>

                    <div className="card-bottom">
                      <div className="card-tags">
                        {Array.isArray(job.skills) &&
                          job.skills.slice(0, 5).map((skill) => (
                            <span className="tag" key={`${job.id}-${skill}`}>
                              {skill}
                            </span>
                          ))}
                      </div>
                      <div className="card-actions">
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => navigate(`/jobs/${job.id}`)}
                        >
                          View Details
                        </button>
                        {!isApplied ? (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleApplyClick(job)}
                          >
                            <Send size={14} />
                            Apply Now
                          </button>
                        ) : (
                          <>
                            <span className="btn-applied">
                              <CheckCircle size={16} />
                              Applied
                            </span>
                            {iv?.status === "completed" && (
                              <span
                                className="btn-interview-done"
                                title={
                                  iv.results_released
                                    ? `Score: ${iv.overall_score}`
                                    : "Results pending"
                                }
                              >
                                <CheckCircle size={14} />
                                {iv.results_released
                                  ? `Interviewed (${Math.round(iv.overall_score || 0)}/100)`
                                  : "Interview complete"}
                              </span>
                            )}
                            {(iv?.status === "scheduled" || iv?.status === "in_progress") && (
                              <button
                                type="button"
                                className="btn btn-accent btn-sm"
                                onClick={() => navigate(`/interview/${iv.interview_token}`)}
                              >
                                <Video size={14} />
                                {iv.status === "in_progress" ? "Resume AI interview" : "Take AI interview"}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {visibleJobs.length > 0 && jobs.length < total && (
              <div className="load-more-wrapper">
                <button
                  className="btn btn-outline"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <>
                      <Loader size={16} className="spin" /> Loading...
                    </>
                  ) : (
                    "Load More Jobs"
                  )}
                </button>
              </div>
            )}
          </>
        )}

        {/* Apply Modal */}
        {showApplyModal && applyingJob && (
          <div className="modal-overlay" onClick={handleCloseApplyModal}>
            <div
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>{applySuccess ? "Application Sent!" : "Apply for this Role"}</h2>
                <button className="modal-close" onClick={handleCloseApplyModal}>
                  <X size={24} />
                </button>
              </div>
              <div className="modal-body">
                <div className="apply-modal-job-info">
                  <h3>{applyingJob.title}</h3>
                  <p>
                    {applyingJob.company_name || "Company"} &bull;{" "}
                    {applyingJob.location}
                  </p>
                </div>

                {applySuccess ? (
                  <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
                    <CheckCircle
                      size={48}
                      style={{ color: "#10b981", marginBottom: "1rem" }}
                    />
                    <p style={{ color: "var(--text-primary)", fontSize: "1.1rem" }}>
                      Your application has been submitted successfully!
                    </p>
                    <p style={{ color: "var(--text-secondary)", marginTop: "0.5rem" }}>
                      The recruiter will review your profile and get back to you.
                    </p>
                    <button
                      className="btn btn-primary"
                      style={{ marginTop: "1.5rem" }}
                      onClick={handleCloseApplyModal}
                    >
                      Continue Browsing
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitApplication}>
                    {applyError && (
                      <div className="alert alert-error">{applyError}</div>
                    )}

                    <div className="form-group">
                      <label htmlFor="cover_letter">
                        Cover Letter (optional)
                      </label>
                      <textarea
                        id="cover_letter"
                        className="input-field"
                        rows="5"
                        placeholder="Tell the recruiter why you're a great fit for this role..."
                        value={coverLetter}
                        onChange={(e) => setCoverLetter(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="resume_url">
                        Resume URL (optional, defaults to your profile resume)
                      </label>
                      <input
                        type="url"
                        id="resume_url"
                        className="input-field"
                        placeholder="https://example.com/my-resume.pdf"
                        value={resumeUrl}
                        onChange={(e) => setResumeUrl(e.target.value)}
                      />
                    </div>

                    <div className="modal-actions">
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={handleCloseApplyModal}
                        disabled={applyLoading}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={applyLoading}
                      >
                        {applyLoading ? "Submitting..." : "Submit Application"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CandidateJobs;
