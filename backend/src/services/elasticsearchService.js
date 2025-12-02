const { Client } = require('@elastic/elasticsearch');

class ElasticsearchService {
  constructor() {
    this.client = new Client({
      node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200'
    });
    this.jobsIndex = 'jobs';
  }

  // Helper method to handle response format differences
  getResponseBody(response) {
    return response.body || response;
  }

  async init() {
    try {
      const response = await this.client.info();
      console.log('✅ Connected to Elasticsearch!');
      
      // Handle different response formats between ES versions
      const clusterName = response.cluster_name || response.body?.cluster_name || 'ES Cluster';
      console.log(`Cluster name: ${clusterName}`);
      
      // Create jobs index with mapping
      await this.createJobsIndex();
    } catch (error) {
      console.error('❌ Elasticsearch connection failed:', error.message);
      throw error;
    }
  }

  async createJobsIndex() {
    try {
      // Delete existing index if it exists
      await this.client.indices.delete({ 
        index: this.jobsIndex,
        ignore_unavailable: true 
      });

      // Create new index with mapping
      await this.client.indices.create({
        index: this.jobsIndex,
        body: {
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0,
            analysis: {
              analyzer: {
                job_text_analyzer: {
                  type: 'custom',
                  tokenizer: 'standard',
                  filter: ['lowercase', 'stop', 'stemmer']
                },
                skill_analyzer: {
                  type: 'custom',
                  tokenizer: 'keyword',
                  filter: ['lowercase', 'trim']
                }
              }
            }
          },
          mappings: {
            properties: {
              id: { type: 'keyword' },
              title: { 
                type: 'text', 
                analyzer: 'job_text_analyzer',
                fields: {
                  keyword: { type: 'keyword' }
                }
              },
              description: { 
                type: 'text', 
                analyzer: 'job_text_analyzer' 
              },
              employment_type: { type: 'keyword' },
              experience_level: { type: 'keyword' },
              location_type: { type: 'keyword' },
              location: { 
                type: 'text', 
                analyzer: 'standard',
                fields: {
                  keyword: { type: 'keyword' }
                }
              },
              salary_min: { type: 'integer' },
              salary_max: { type: 'integer' },
              salary_currency: { type: 'keyword' },
              skills: { 
                type: 'text',
                analyzer: 'skill_analyzer',
                fields: {
                  keyword: { type: 'keyword' }
                }
              },
              company_id: { type: 'keyword' },
              company_name: { 
                type: 'text',
                fields: {
                  keyword: { type: 'keyword' }
                }
              },
              recruiter_id: { type: 'keyword' },
              is_active: { type: 'boolean' },
              is_deleted: { type: 'boolean' },
              created_at: { type: 'date' },
              updated_at: { type: 'date' },
              apply_url: { type: 'keyword' },
              // Derived fields for better search
              salary_range: { type: 'keyword' }, // e.g., "50k-80k", "80k-120k"
              full_text: { type: 'text', analyzer: 'job_text_analyzer' } // Combined searchable text
            }
          }
        }
      });

      console.log(`✅ Created index: ${this.jobsIndex}`);
    } catch (error) {
      console.error(`❌ Failed to create index ${this.jobsIndex}:`, error.message);
      throw error;
    }
  }

  // Index a single job
  async indexJob(jobData, companyName = null) {
    try {
      // Prepare document for indexing
      const document = this.prepareJobDocument(jobData, companyName);
      
      const response = await this.client.index({
        index: this.jobsIndex,
        id: jobData._id.toString(),
        body: document
      });

      console.log(`✅ Indexed job: ${jobData.title} (${jobData._id})`);
      return response;
    } catch (error) {
      console.error(`❌ Failed to index job ${jobData._id}:`, error.message);
      throw error;
    }
  }

  // Index multiple jobs (bulk operation)
  async bulkIndexJobs(jobs, companiesMap = {}) {
    if (!jobs || jobs.length === 0) return;

    try {
      const operations = [];
      
      jobs.forEach(job => {
        const companyName = companiesMap[job.company_id] || null;
        const document = this.prepareJobDocument(job, companyName);
        
        operations.push({ index: { _index: this.jobsIndex, _id: job._id.toString() } });
        operations.push(document);
      });

      const bulk = await this.client.bulk({ body: operations });
      const bulkResponse = this.getResponseBody(bulk);
      
      if (bulkResponse.errors) {
        console.error('❌ Bulk indexing had errors:', bulkResponse.items.filter(item => item.index.error));
      } else {
        console.log(`✅ Bulk indexed ${jobs.length} jobs`);
      }
      
      return bulk;
    } catch (error) {
      console.error('❌ Bulk indexing failed:', error.message);
      throw error;
    }
  }

  // Prepare job document for Elasticsearch
  prepareJobDocument(jobData, companyName = null) {
    // Create salary range string for easy filtering
    let salaryRange = 'Not specified';
    if (jobData.salary_min && jobData.salary_max) {
      const minK = Math.round(jobData.salary_min / 1000);
      const maxK = Math.round(jobData.salary_max / 1000);
      salaryRange = `${minK}k-${maxK}k`;
    } else if (jobData.salary_min) {
      const minK = Math.round(jobData.salary_min / 1000);
      salaryRange = `${minK}k+`;
    }

    // Create full text for comprehensive search
    const fullText = [
      jobData.title,
      jobData.description,
      companyName,
      jobData.location,
      ...(jobData.skills || [])
    ].filter(Boolean).join(' ');

    return {
      id: jobData._id.toString(),
      title: jobData.title,
      description: jobData.description,
      employment_type: jobData.employment_type,
      experience_level: jobData.experience_level,
      location_type: jobData.location_type,
      location: jobData.location,
      salary_min: jobData.salary_min,
      salary_max: jobData.salary_max,
      salary_currency: jobData.salary_currency || 'USD',
      skills: jobData.skills || [],
      company_id: jobData.company_id,
      company_name: companyName,
      recruiter_id: jobData.recruiter_id,
      is_active: jobData.is_active,
      is_deleted: jobData.is_deleted,
      created_at: jobData.createdAt,
      updated_at: jobData.updatedAt,
      apply_url: jobData.apply_url,
      salary_range: salaryRange,
      full_text: fullText
    };
  }

  // Advanced job search with filters
  async searchJobs({
    query = '',
    location = '',
    employment_type = [],
    experience_level = [],
    location_type = [],
    skills = [],
    salary_min = null,
    salary_max = null,
    company_id = '',
    sort_by = 'relevance', // relevance, date_desc, date_asc, salary_desc, salary_asc
    page = 1,
    size = 20
  }) {
    try {
      const from = (page - 1) * size;
      
      // Build the search query
      const searchBody = {
        from,
        size,
        query: {
          bool: {
            must: [],
            filter: [
              { term: { is_active: true } },
              { term: { is_deleted: false } }
            ]
          }
        },
        aggs: {
          locations: {
            terms: { field: 'location.keyword', size: 20 }
          },
          employment_types: {
            terms: { field: 'employment_type', size: 10 }
          },
          experience_levels: {
            terms: { field: 'experience_level', size: 10 }
          },
          location_types: {
            terms: { field: 'location_type', size: 10 }
          },
          skills: {
            terms: { field: 'skills.keyword', size: 30 }
          },
          salary_ranges: {
            terms: { field: 'salary_range', size: 10 }
          }
        }
      };

      // Text search
      if (query) {
        searchBody.query.bool.must.push({
          multi_match: {
            query,
            fields: [
              'title^3',
              'description^2',
              'skills^2',
              'company_name^2',
              'location',
              'full_text'
            ],
            type: 'best_fields',
            fuzziness: 'AUTO'
          }
        });
      } else {
        searchBody.query.bool.must.push({ match_all: {} });
      }

      // Location filter
      if (location) {
        searchBody.query.bool.filter.push({
          multi_match: {
            query: location,
            fields: ['location', 'location.keyword'],
            fuzziness: 'AUTO'
          }
        });
      }

      // Employment type filter
      if (employment_type.length > 0) {
        searchBody.query.bool.filter.push({
          terms: { employment_type: employment_type }
        });
      }

      // Experience level filter
      if (experience_level.length > 0) {
        searchBody.query.bool.filter.push({
          terms: { experience_level: experience_level }
        });
      }

      // Location type filter
      if (location_type.length > 0) {
        searchBody.query.bool.filter.push({
          terms: { location_type: location_type }
        });
      }

      // Skills filter
      if (skills.length > 0) {
        searchBody.query.bool.filter.push({
          bool: {
            should: skills.map(skill => ({
              match: { skills: { query: skill, fuzziness: 'AUTO' } }
            })),
            minimum_should_match: 1
          }
        });
      }

      // Salary range filter
      if (salary_min !== null || salary_max !== null) {
        const rangeFilter = {};
        if (salary_min !== null) rangeFilter.gte = salary_min;
        if (salary_max !== null) rangeFilter.lte = salary_max;
        
        searchBody.query.bool.filter.push({
          bool: {
            should: [
              { range: { salary_min: rangeFilter } },
              { range: { salary_max: rangeFilter } }
            ],
            minimum_should_match: 1
          }
        });
      }

      // Company filter
      if (company_id) {
        searchBody.query.bool.filter.push({
          term: { company_id: company_id }
        });
      }

      // Sorting
      switch (sort_by) {
        case 'date_desc':
          searchBody.sort = [{ created_at: { order: 'desc' } }];
          break;
        case 'date_asc':
          searchBody.sort = [{ created_at: { order: 'asc' } }];
          break;
        case 'salary_desc':
          searchBody.sort = [
            { salary_max: { order: 'desc', missing: '_last' } },
            { salary_min: { order: 'desc', missing: '_last' } }
          ];
          break;
        case 'salary_asc':
          searchBody.sort = [
            { salary_min: { order: 'asc', missing: '_last' } },
            { salary_max: { order: 'asc', missing: '_last' } }
          ];
          break;
        default: // relevance
          if (!query) {
            searchBody.sort = [{ created_at: { order: 'desc' } }];
          }
          break;
      }

      const response = await this.client.search({
        index: this.jobsIndex,
        body: searchBody
      });

      const responseBody = this.getResponseBody(response);

      return {
        jobs: responseBody.hits.hits.map(hit => ({
          id: hit._id,
          score: hit._score,
          ...hit._source
        })),
        total: responseBody.hits.total.value,
        aggregations: responseBody.aggregations,
        page,
        size,
        total_pages: Math.ceil(responseBody.hits.total.value / size)
      };

    } catch (error) {
      console.error('❌ Job search failed:', error.message);
      throw error;
    }
  }

  // Get job suggestions for autocomplete
  async getJobSuggestions(query, field = 'title') {
    try {
      // Use simple search with prefix matching for suggestions
      const searchField = field === 'title' ? 'title' : 
                         field === 'location' ? 'location' :
                         field === 'skills' ? 'skills' :
                         field === 'company_name' ? 'company_name' : 'title';

      const response = await this.client.search({
        index: this.jobsIndex,
        body: {
          size: 10,
          query: {
            bool: {
              must: [
                { term: { is_active: true } },
                { term: { is_deleted: false } }
              ],
              should: [
                {
                  prefix: {
                    [`${searchField}.keyword`]: {
                      value: query.toLowerCase(),
                      boost: 3
                    }
                  }
                },
                {
                  wildcard: {
                    [`${searchField}.keyword`]: {
                      value: `*${query.toLowerCase()}*`,
                      boost: 2
                    }
                  }
                },
                {
                  match: {
                    [searchField]: {
                      query: query,
                      fuzziness: 'AUTO',
                      boost: 1
                    }
                  }
                }
              ],
              minimum_should_match: 1
            }
          },
          _source: [searchField],
          collapse: {
            field: `${searchField}.keyword`
          },
          sort: [
            { _score: { order: 'desc' } }
          ]
        }
      });

      const responseBody = this.getResponseBody(response);
      
      // Extract unique suggestions
      const suggestions = new Set();
      responseBody.hits.hits.forEach(hit => {
        const value = hit._source[searchField];
        if (value) {
          if (Array.isArray(value)) {
            // For skills array
            value.forEach(skill => {
              if (skill.toLowerCase().includes(query.toLowerCase())) {
                suggestions.add(skill);
              }
            });
          } else {
            // For single values like title, location, company_name
            suggestions.add(value);
          }
        }
      });

      return Array.from(suggestions).slice(0, 10).map(text => ({
        text,
        score: 1.0 // Simple scoring for suggestions
      }));
      
    } catch (error) {
      console.error('❌ Job suggestions failed:', error.message);
      return [];
    }
  }

  // Delete job from index
  async deleteJob(jobId) {
    try {
      await this.client.delete({
        index: this.jobsIndex,
        id: jobId,
        ignore: [404]
      });
      console.log(`✅ Deleted job from index: ${jobId}`);
    } catch (error) {
      console.error(`❌ Failed to delete job ${jobId}:`, error.message);
      throw error;
    }
  }

  // Update job in index
  async updateJob(jobId, jobData, companyName = null) {
    try {
      const document = this.prepareJobDocument(jobData, companyName);
      
      await this.client.update({
        index: this.jobsIndex,
        id: jobId,
        body: {
          doc: document
        }
      });
      
      console.log(`✅ Updated job in index: ${jobId}`);
    } catch (error) {
      console.error(`❌ Failed to update job ${jobId}:`, error.message);
      throw error;
    }
  }
}

module.exports = new ElasticsearchService();
