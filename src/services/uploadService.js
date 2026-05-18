/**
 * Upload Service - Frontend API client for FreeSkill backend
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Upload a skill file and start audit
 * @param {File} file - Skill file (.SKILL.md, .skill.zip)
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<{jobId: string, status: string}>}
 */
export async function uploadSkill(file, onProgress) {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(`${API_BASE}/api/upload`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}

/**
 * Poll job status
 * @param {string} jobId - Job ID
 * @param {number} interval - Poll interval in ms
 * @param {Function} onStatusChange - Status change callback
 * @returns {Promise<Object>} Final job result
 */
export async function pollJobStatus(jobId, interval = 2000, onStatusChange) {
  return new Promise((resolve, reject) => {
    let lastStatus = '';

    const poll = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/status/${jobId}`);
        if (!response.ok) {
          throw new Error('Failed to get job status');
        }

        const job = await response.json();

        if (onStatusChange && job.status !== lastStatus) {
          lastStatus = job.status;
          onStatusChange(job);
        }

        // Check if terminal state
        if (['approved', 'rejected', 'failed'].includes(job.status)) {
          resolve(job);
          return;
        }

        // Continue polling
        setTimeout(poll, interval);
      } catch (error) {
        reject(error);
      }
    };

    poll();
  });
}

/**
 * Submit approved job to blockchain
 * @param {string} jobId - Job ID
 * @returns {Promise<{skillId: string, txHash: string}>}
 */
export async function submitToChain(jobId) {
  const response = await fetch(`${API_BASE}/api/chain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Chain submission failed');
  }

  return await response.json();
}

/**
 * Full upload + audit + chain flow
 * @param {File} file - Skill file
 * @param {Object} callbacks - { onStatusChange, onComplete, onError }
 * @returns {Promise<Object>} Final result with skillId and txHash
 */
export async function fullAuditFlow(file, callbacks = {}) {
  const { onStatusChange, onComplete, onError } = callbacks;

  try {
    // Step 1: Upload
    onStatusChange?.({ status: 'uploading', message: 'Uploading skill...' });
    const { jobId } = await uploadSkill(file);

    // Step 2: Poll status
    const finalResult = await pollJobStatus(jobId, 2000, onStatusChange);

    // Step 3: Check result
    if (finalResult.status === 'approved') {
      onStatusChange?.({ status: 'approved', message: 'Audit passed!' });

      // Step 4: Submit to chain
      onStatusChange?.({ status: 'submitting', message: 'Submitting to blockchain...' });
      const chainResult = await submitToChain(jobId);

      onComplete?.({
        success: true,
        skillId: chainResult.skillId,
        txHash: chainResult.txHash,
        auditResult: finalResult.result
      });

      return chainResult;
    } else if (finalResult.status === 'review') {
      onStatusChange?.({ status: 'review', message: 'Needs manual review' });
      onComplete?.({ success: false, status: 'review', auditResult: finalResult.result });
      return { success: false, status: 'review' };
    } else {
      onError?.({ status: finalResult.status, error: 'Audit failed', auditResult: finalResult.result });
      throw new Error(`Audit failed: ${finalResult.status}`);
    }
  } catch (error) {
    onError?.({ error: error.message });
    throw error;
  }
}

export default {
  uploadSkill,
  pollJobStatus,
  submitToChain,
  fullAuditFlow
};
