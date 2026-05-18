/**
 * In-memory job queue for audit status tracking
 */

const jobs = new Map();

/**
 * Add a new job to the queue
 * @param {Object} jobData - Job data
 * @returns {Object} - Created job
 */
function addJob(jobData) {
  jobs.set(jobData.id, {
    ...jobData,
    status: jobData.status || 'pending',
    result: null,
    error: null
  });
  return jobs.get(jobData.id);
}

/**
 * Update job status and data
 * @param {string} jobId - Job ID
 * @param {Object} updates - Fields to update
 * @returns {Object|null} - Updated job or null if not found
 */
function updateJob(jobId, updates) {
  const job = jobs.get(jobId);
  if (!job) return null;

  const updated = { ...job, ...updates };
  jobs.set(jobId, updated);
  return updated;
}

/**
 * Get job by ID
 * @param {string} jobId - Job ID
 * @returns {Object|null} - Job or null if not found
 */
function getJob(jobId) {
  return jobs.get(jobId) || null;
}

/**
 * Get all jobs
 * @returns {Array} - All jobs
 */
function getAllJobs() {
  return Array.from(jobs.values());
}

/**
 * Delete job by ID
 * @param {string} jobId - Job ID
 * @returns {boolean} - True if deleted
 */
function deleteJob(jobId) {
  return jobs.delete(jobId);
}

/**
 * Clear all jobs
 */
function clearJobs() {
  jobs.clear();
}

module.exports = {
  jobs,
  addJob,
  updateJob,
  getJob,
  getAllJobs,
  deleteJob,
  clearJobs
};
