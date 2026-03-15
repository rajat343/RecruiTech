import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { graphqlRequest } from "../../utils/graphql";
import {
  Search,
  MapPin,
  Briefcase,
  Clock,
  DollarSign,
  Building2,
  CheckCircle,
  Send,
  X,
  Filter,
  Loader,
} from "lucide-react";
import "./CandidateJobs.css";
import "./CandidateHome.css";

const PAGE_SIZE = 15;

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
    ? t
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
    : "";

const CandidateJobs = () => {
  const { token } = useAuth();

  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const [searchTerm, setSearchTerm] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [locationType, setLocationType] = useState("");

  const [appliedJobs, setAppliedJobs] = useState(new Set());

  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyingJob, setApplyingJob] = useState(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyError, setApplyError] = useState(null);
  const [applySuccess, setApplySuccess] = useState(false);

  const buildFilters = useCallback(() => {
    const filters = {};
    if (searchTerm.trim()) filters.search = searchTerm.trim();
    if (employmentType) filters.employment_type = employmentType;
    if (experienceLevel) filters.experience_level = experienceLevel;
    if (locationType) filters.location_type = locationType;
    return filters;
  }, [searchTerm, employmentType, experienceLevel, locationType]);

  const fetchJobs = useCallback(
    async (newOffset = 0, append = false) => {
      if (!append) setLoading(true);
      else setLoadingMore(true);

      try {
        const filters = buildFilters();
        const data = await graphqlRequest(
          `
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
              }
            }
          }
          `,
          { filters, limit: PAGE_SIZE, offset: newOffset },
          token
        );

        const result = data.searchJobs;
        if (append) {
          setJobs((prev) => [...prev, ...result.jobs]);
        } else {
          setJobs(result.jobs);
        }
        setTotal(result.total);
        setOffset(newOffset + result.jobs.length);
      } catch (err) {
        console.error("Error fetching jobs:", err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [token, buildFilters]
  );

  const fetchAppliedStatus = useCallback(async () => {
    if (!token) return;
    try {
      const data = await graphqlRequest(
        `
        query MyApplications {
          myApplications(limit: 200) {
            job_id
          }
        }
        `,
        {},
        token
      );
      const ids = new Set(data.myApplications.map((a) => a.job_id));
      setAppliedJobs(ids);
    } catch {
      // Candidate might not have a profile yet
    }
  }, [token]);

  useEffect(() => {
    fetchJobs(0);
    fetchAppliedStatus();
  }, [fetchJobs, fetchAppliedStatus]);

  const handleSearch = (e) => {
    e.preventDefault();
    setOffset(0);
    fetchJobs(0);
  };

  const handleFilterChange = () => {
    setTimeout(() => {
      setOffset(0);
      fetchJobs(0);
    }, 0);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setEmploymentType("");
    setExperienceLevel("");
    setLocationType("");
    setTimeout(() => {
      setOffset(0);
    }, 0);
  };

  useEffect(() => {
    if (
      searchTerm === "" &&
      employmentType === "" &&
      experienceLevel === "" &&
      locationType === ""
    ) {
      fetchJobs(0);
    }
  }, [searchTerm, employmentType, experienceLevel, locationType, fetchJobs]);

  const handleLoadMore = () => {
    fetchJobs(offset, true);
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

  const hasFilters = searchTerm || employmentType || experienceLevel || locationType;

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
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
              onChange={(e) => {
                setEmploymentType(e.target.value);
                handleFilterChange();
              }}
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
              onChange={(e) => {
                setExperienceLevel(e.target.value);
                handleFilterChange();
              }}
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
              onChange={(e) => {
                setLocationType(e.target.value);
                handleFilterChange();
              }}
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
            {loading ? "Searching..." : `${total} job${total !== 1 ? "s" : ""} found`}
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
        ) : (
          <>
            <div className="jobs-grid">
              {jobs.map((job) => {
                const salary = formatSalary(
                  job.salary_min,
                  job.salary_max,
                  job.salary_currency
                );
                const isApplied = appliedJobs.has(job.id);

                return (
                  <div className="job-search-card" key={job.id}>
                    <div className="card-top">
                      <div className="card-top-left">
                        <div className="company-icon">
                          <Building2 size={22} />
                        </div>
                        <div className="card-info">
                          <h3>{job.title}</h3>
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
                        {isApplied ? (
                          <span className="btn-applied">
                            <CheckCircle size={16} />
                            Applied
                          </span>
                        ) : (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleApplyClick(job)}
                          >
                            <Send size={14} />
                            Apply Now
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {jobs.length < total && (
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
