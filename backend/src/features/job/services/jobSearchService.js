const elasticsearchService = require('../../../services/elasticsearchService');
const Company = require('../../../models/company.schema');
const Job = require('../../../models/job.schema');

/**
 * Job Search Service - handles all job search operations with Elasticsearch
 */
class JobSearchService {
  
  /**
   * Search jobs with advanced filters
   * @param {Object} filters - Search filters
   * @returns {Object} Search results with aggregations
   */
  async searchJobs(filters) {
    try {
      // Set defaults
      const searchParams = {
        query: filters.query || '',
        location: filters.location || '',
        employment_type: filters.employment_type || [],
        experience_level: filters.experience_level || [],
        location_type: filters.location_type || [],
        skills: filters.skills || [],
        salary_min: filters.salary_min,
        salary_max: filters.salary_max,
        company_id: filters.company_id || '',
        sort_by: filters.sort_by || 'relevance',
        page: filters.page || 1,
        size: filters.size || 20
      };

      const results = await elasticsearchService.searchJobs(searchParams);
      
      // Format aggregations for GraphQL
      const formatAggregations = (aggs) => {
        if (!aggs) return null;
        
        const formatBuckets = (buckets) => 
          buckets ? buckets.map(bucket => ({
            key: bucket.key,
            doc_count: bucket.doc_count
          })) : [];

        return {
          locations: formatBuckets(aggs.locations?.buckets),
          employment_types: formatBuckets(aggs.employment_types?.buckets),
          experience_levels: formatBuckets(aggs.experience_levels?.buckets),
          location_types: formatBuckets(aggs.location_types?.buckets),
          skills: formatBuckets(aggs.skills?.buckets),
          salary_ranges: formatBuckets(aggs.salary_ranges?.buckets)
        };
      };

      return {
        jobs: results.jobs.map(job => ({
          ...job,
          created_at: job.created_at,
          updated_at: job.updated_at
        })),
        total: results.total,
        page: results.page,
        size: results.size,
        total_pages: results.total_pages,
        aggregations: formatAggregations(results.aggregations)
      };
    } catch (error) {
      console.error('Job search failed:', error);
      throw new Error(`Job search failed: ${error.message}`);
    }
  }

  /**
   * Get job suggestions for autocomplete
   * @param {String} query - Search query
   * @param {String} field - Field to search (title, location, etc.)
   * @returns {Array} Suggestions
   */
  async getJobSuggestions(query, field = 'title') {
    try {
      return await elasticsearchService.getJobSuggestions(query, field);
    } catch (error) {
      console.error('Job suggestions failed:', error);
      throw new Error(`Job suggestions failed: ${error.message}`);
    }
  }

  /**
   * Index a job when created/updated
   * @param {Object} job - Job document
   * @returns {Object} Indexing response
   */
  async indexJob(job) {
    try {
      // Get company name for better search
      let companyName = null;
      if (job.company_id) {
        const company = await Company.findById(job.company_id);
        companyName = company?.name || null;
      }

      return await elasticsearchService.indexJob(job, companyName);
    } catch (error) {
      console.error('Job indexing failed:', error);
      // Don't throw error - we don't want to break job creation if ES is down
    }
  }

  /**
   * Remove job from index when deleted
   * @param {String} jobId - Job ID
   */
  async deleteJobFromIndex(jobId) {
    try {
      await elasticsearchService.deleteJob(jobId);
    } catch (error) {
      console.error('Job deletion from index failed:', error);
      // Don't throw error - we don't want to break job deletion if ES is down
    }
  }

  /**
   * Update job in index
   * @param {Object} job - Updated job document
   */
  async updateJobInIndex(job) {
    try {
      let companyName = null;
      if (job.company_id) {
        const company = await Company.findById(job.company_id);
        companyName = company?.name || null;
      }

      await elasticsearchService.updateJob(job._id.toString(), job, companyName);
    } catch (error) {
      console.error('Job update in index failed:', error);
      // Don't throw error - we don't want to break job updates if ES is down
    }
  }

  /**
   * Reindex all jobs (admin operation)
   * @returns {Boolean} Success status
   */
  async reindexAllJobs() {
    try {
      console.log('Starting full job reindexing...');
      
      // Get all active jobs
      const jobs = await Job.find({ is_deleted: false });
      
      if (jobs.length === 0) {
        console.log('No jobs found to index');
        return true;
      }

      // Get company names for all jobs
      const companyIds = [...new Set(jobs.map(job => job.company_id))];
      const companies = await Company.find({ _id: { $in: companyIds } });
      const companiesMap = {};
      companies.forEach(company => {
        companiesMap[company._id.toString()] = company.name;
      });

      // Recreate index
      await elasticsearchService.createJobsIndex();

      // Bulk index jobs
      await elasticsearchService.bulkIndexJobs(jobs, companiesMap);
      
      console.log(`✅ Successfully reindexed ${jobs.length} jobs`);
      return true;
    } catch (error) {
      console.error('Full job reindexing failed:', error);
      throw new Error(`Reindexing failed: ${error.message}`);
    }
  }

  /**
   * Get popular search terms and filters
   * @returns {Object} Popular terms
   */
  async getPopularSearchTerms() {
    try {
      const results = await elasticsearchService.searchJobs({
        query: '',
        page: 1,
        size: 1 // We only need aggregations
      });

      const aggregations = results.aggregations;
      
      return {
        popular_locations: aggregations?.locations?.buckets?.slice(0, 10) || [],
        popular_skills: aggregations?.skills?.buckets?.slice(0, 15) || [],
        employment_types: aggregations?.employment_types?.buckets || [],
        experience_levels: aggregations?.experience_levels?.buckets || [],
        location_types: aggregations?.location_types?.buckets || []
      };
    } catch (error) {
      console.error('Failed to get popular search terms:', error);
      return {
        popular_locations: [],
        popular_skills: [],
        employment_types: [],
        experience_levels: [],
        location_types: []
      };
    }
  }
}

module.exports = new JobSearchService();
