const express = require('express');
const AmazonAutomation = require('./index');
require('dotenv').config();

const app = express();
const PORT = process.env.API_PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Store scraping jobs
const jobs = new Map();
let jobIdCounter = 1;
let isJobRunning = false; // Track if a job is currently running

// Rate limiting - track requests
const requestTracker = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS = 10; // 10 requests per minute

// Rate limiting middleware
app.use((req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  if (!requestTracker.has(ip)) {
    requestTracker.set(ip, []);
  }
  
  const requests = requestTracker.get(ip).filter(time => now - time < RATE_LIMIT_WINDOW);
  
  if (requests.length >= MAX_REQUESTS) {
    return res.status(429).json({
      error: 'Too many requests',
      message: `Rate limit: ${MAX_REQUESTS} requests per minute. Please wait.`,
      retryAfter: Math.ceil((requests[0] + RATE_LIMIT_WINDOW - now) / 1000)
    });
  }
  
  requests.push(now);
  requestTracker.set(ip, requests);
  next();
});

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, User-Agent');
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  next();
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    message: 'Amazon Scraper API',
    isJobRunning: isJobRunning,
    endpoints: {
      'POST /trigger': 'Start scraping (recommended for n8n)',
      'POST /run': 'Simple endpoint - Scrape from Google Sheets',
      'GET /status': 'Check if scraping job is running',
      'GET /api/jobs/:id': 'Get job status',
      'GET /api/jobs': 'List all jobs'
    }
  });
});

// New /trigger endpoint - prevents concurrent jobs
app.post('/trigger', async (req, res) => {
  // Check if a job is already running
  if (isJobRunning) {
    return res.status(429).json({
      error: 'Scraper is busy',
      message: 'A scraping job is already running. Please try again in a few minutes.',
      isJobRunning: true
    });
  }

  const jobId = jobIdCounter++;
  isJobRunning = true;
  
  jobs.set(jobId, {
    id: jobId,
    status: 'running',
    startedAt: new Date().toISOString(),
    error: null
  });

  // Send immediate response
  res.json({
    success: true,
    jobId,
    message: 'Scraping started',
    isJobRunning: true
  });

  // Run scraping in background
  const automation = new AmazonAutomation();
  
  try {
    console.log(`[Job ${jobId}] Starting scraping job...`);
    await automation.run();
    
    jobs.set(jobId, {
      ...jobs.get(jobId),
      status: 'completed',
      completedAt: new Date().toISOString()
    });
    console.log(`[Job ${jobId}] Completed successfully`);
  } catch (error) {
    jobs.set(jobId, {
      ...jobs.get(jobId),
      status: 'failed',
      error: error.message,
      completedAt: new Date().toISOString()
    });
    console.error(`[Job ${jobId}] Failed:`, error.message);
  } finally {
    isJobRunning = false;
    console.log(`[Job ${jobId}] Job finished, ready for next request`);
  }
});

// Status check endpoint
app.get('/status', (req, res) => {
  const runningJob = Array.from(jobs.values()).find(j => j.status === 'running');
  res.json({
    isJobRunning: isJobRunning,
    currentJob: runningJob || null,
    totalJobs: jobs.size
  });
});

// Simple /run endpoint for n8n
app.post('/run', async (req, res) => {
  // Check if a job is already running
  if (isJobRunning) {
    return res.status(429).json({
      error: 'Job already running',
      message: 'Another scraping job is currently in progress. Please wait for it to complete.',
      currentJob: Array.from(jobs.values()).find(j => j.status === 'running')
    });
  }

  const jobId = jobIdCounter++;
  isJobRunning = true;
  
  jobs.set(jobId, {
    id: jobId,
    status: 'running',
    startedAt: new Date().toISOString(),
    products: [],
    error: null
  });

  res.json({
    jobId,
    status: 'started',
    message: 'Scraping from Google Sheets started',
    checkStatus: `https://pinterest-scraper-1.onrender.com/api/jobs/${jobId}`,
    getProducts: `https://pinterest-scraper-1.onrender.com/api/jobs/${jobId}/products`
  });

  // Run scraping in background
  const automation = new AmazonAutomation();
  
  try {
    await automation.run();
    jobs.set(jobId, {
      ...jobs.get(jobId),
      status: 'completed',
      completedAt: new Date().toISOString()
    });
  } catch (error) {
    jobs.set(jobId, {
      ...jobs.get(jobId),
      status: 'failed',
      error: error.message,
      completedAt: new Date().toISOString()
    });
  } finally {
    isJobRunning = false; // Release the lock
  }
});

// Start scraping from Google Sheets
app.post('/api/scrape', async (req, res) => {
  const jobId = jobIdCounter++;
  
  jobs.set(jobId, {
    id: jobId,
    status: 'running',
    startedAt: new Date().toISOString(),
    products: [],
    error: null
  });

  res.json({
    jobId,
    status: 'started',
    message: 'Scraping job started. Check status at /api/jobs/' + jobId
  });

  // Run scraping in background
  const automation = new AmazonAutomation();
  
  try {
    // We need to modify the automation to return results
    await automation.run();
    
    jobs.set(jobId, {
      ...jobs.get(jobId),
      status: 'completed',
      completedAt: new Date().toISOString()
    });
  } catch (error) {
    jobs.set(jobId, {
      ...jobs.get(jobId),
      status: 'failed',
      error: error.message,
      completedAt: new Date().toISOString()
    });
  }
});

// Scrape specific URLs
app.post('/api/scrape/urls', async (req, res) => {
  const { urls, affiliateTag } = req.body;
  
  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({
      error: 'Please provide an array of Amazon URLs'
    });
  }

  const jobId = jobIdCounter++;
  
  jobs.set(jobId, {
    id: jobId,
    status: 'running',
    startedAt: new Date().toISOString(),
    urls,
    products: [],
    error: null
  });

  res.json({
    jobId,
    status: 'started',
    message: `Scraping ${urls.length} URLs. Check status at /api/jobs/${jobId}`
  });

  // Import scraper
  const AmazonScraper = require('./amazonScraper');
  const scraper = new AmazonScraper();
  
  // Override affiliate tag if provided
  if (affiliateTag) {
    scraper.affiliateTag = affiliateTag;
  }

  // Run scraping in background
  (async () => {
    try {
      await scraper.init();
      const allProducts = [];

      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        console.log(`[API] Scraping ${i + 1}/${urls.length}: ${url}`);
        
        try {
          const products = await scraper.scrapeSearchResults(url);
          allProducts.push(...products);
          
          // Update job status
          jobs.set(jobId, {
            ...jobs.get(jobId),
            products: allProducts,
            progress: `${i + 1}/${urls.length}`
          });

          if (i < urls.length - 1) {
            await new Promise(r => setTimeout(r, 5000 + Math.random() * 3000));
          }
        } catch (error) {
          console.error(`Error scraping URL ${i + 1}:`, error.message);
        }
      }

      await scraper.close();

      jobs.set(jobId, {
        ...jobs.get(jobId),
        status: 'completed',
        products: allProducts,
        completedAt: new Date().toISOString()
      });

    } catch (error) {
      await scraper.close();
      jobs.set(jobId, {
        ...jobs.get(jobId),
        status: 'failed',
        error: error.message,
        completedAt: new Date().toISOString()
      });
    }
  })();
});

// Get job status
app.get('/api/jobs/:id', (req, res) => {
  const jobId = parseInt(req.params.id);
  const job = jobs.get(jobId);

  if (!job) {
    return res.status(404).json({
      error: 'Job not found'
    });
  }

  res.json(job);
});

// List all jobs
app.get('/api/jobs', (req, res) => {
  const allJobs = Array.from(jobs.values());
  res.json({
    total: allJobs.length,
    jobs: allJobs
  });
});

// Get products from a completed job
app.get('/api/jobs/:id/products', (req, res) => {
  const jobId = parseInt(req.params.id);
  const job = jobs.get(jobId);

  if (!job) {
    return res.status(404).json({
      error: 'Job not found'
    });
  }

  if (job.status !== 'completed') {
    return res.status(400).json({
      error: `Job is ${job.status}. Wait for completion.`
    });
  }

  res.json({
    jobId,
    totalProducts: job.products.length,
    products: job.products
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Amazon Scraper API running on http://localhost:${PORT}`);
  console.log(`\nAvailable endpoints:`);
  console.log(`  POST   http://localhost:${PORT}/api/scrape`);
  console.log(`  POST   http://localhost:${PORT}/api/scrape/urls`);
  console.log(`  GET    http://localhost:${PORT}/api/jobs/:id`);
  console.log(`  GET    http://localhost:${PORT}/api/jobs`);
  console.log(`  GET    http://localhost:${PORT}/api/jobs/:id/products\n`);
});

module.exports = app;
