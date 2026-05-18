const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { processAuditJob } = require('./audit-agent');
const { submitToChain } = require('./chain-submit');
const { jobs, addJob, updateJob, getJob } = require('./jobs');

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure directories exist
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const TEMP_DIR = path.join(UPLOADS_DIR, 'temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, TEMP_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const jobId = req.body.jobId || uuidv4();
    cb(null, `${jobId}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.skill.zip', '.SKILL.md', '.md', '.zip'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed: ${allowedExts.join(', ')}`));
    }
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Upload endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const jobId = uuidv4();
    const filePath = req.file.path;
    const originalName = req.file.originalname;

    // Create job entry
    addJob({
      id: jobId,
      status: 'pending',
      filePath,
      originalName,
      createdAt: new Date().toISOString()
    });

    // Start audit process asynchronously
    processAuditJob(jobId, filePath, originalName).catch(err => {
      console.error(`Audit job ${jobId} failed:`, err);
      updateJob(jobId, { status: 'failed', error: err.message });
    });

    res.json({
      jobId,
      status: 'pending',
      message: 'File uploaded, audit in progress'
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get job status
app.get('/api/status/:jobId', (req, res) => {
  const job = getJob(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json(job);
});

// Trigger on-chain submission
app.post('/api/chain', async (req, res) => {
  try {
    const { jobId } = req.body;
    if (!jobId) {
      return res.status(400).json({ error: 'jobId required' });
    }

    const job = getJob(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.status !== 'approved') {
      return res.status(400).json({
        error: 'Job not approved',
        status: job.status,
        message: 'Audit must pass before on-chain submission'
      });
    }

    // Submit to chain
    updateJob(jobId, { status: 'submitting' });
    const result = await submitToChain(job);

    updateJob(jobId, {
      status: 'on_chain',
      skillId: result.skillId,
      txHash: result.txHash
    });

    res.json({
      status: 'on_chain',
      skillId: result.skillId,
      txHash: result.txHash
    });
  } catch (error) {
    console.error('Chain submission error:', error);
    updateJob(req.body.jobId, { status: 'failed', error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: err.message });
});

// Start server
app.listen(PORT, () => {
  console.log(`FreeSkill API server running on port ${PORT}`);
  console.log(`Upload endpoint: POST http://localhost:${PORT}/api/upload`);
  console.log(`Status endpoint: GET http://localhost:${PORT}/api/status/:jobId`);
  console.log(`Chain endpoint: POST http://localhost:${PORT}/api/chain`);
});

module.exports = app;
