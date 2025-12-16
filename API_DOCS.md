# Amazon Scraper API Documentation

## Start the API Server

```bash
npm run api
```

The API will run on `http://localhost:3000`

---

## API Endpoints

### 1. **Health Check**
```
GET /
```

**Response:**
```json
{
  "status": "running",
  "message": "Amazon Scraper API",
  "endpoints": { ... }
}
```

---

### 2. **Scrape from Google Sheets**
```
POST /api/scrape
```

Triggers scraping using URLs from your Google Sheet.

**Response:**
```json
{
  "jobId": 1,
  "status": "started",
  "message": "Scraping job started. Check status at /api/jobs/1"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/scrape
```

---

### 3. **Scrape Specific URLs**
```
POST /api/scrape/urls
```

Scrape specific Amazon URLs directly.

**Request Body:**
```json
{
  "urls": [
    "https://www.amazon.co.uk/s?k=laptop",
    "https://www.amazon.co.uk/s?k=headphones"
  ],
  "affiliateTag": "sachin920-21"
}
```

**Response:**
```json
{
  "jobId": 2,
  "status": "started",
  "message": "Scraping 2 URLs. Check status at /api/jobs/2"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/scrape/urls \
  -H "Content-Type: application/json" \
  -d '{
    "urls": ["https://www.amazon.co.uk/s?k=laptop"],
    "affiliateTag": "sachin920-21"
  }'
```

---

### 4. **Get Job Status**
```
GET /api/jobs/:id
```

Check the status of a scraping job.

**Response:**
```json
{
  "id": 1,
  "status": "running",
  "startedAt": "2025-12-17T10:30:00.000Z",
  "progress": "2/3",
  "products": [...],
  "error": null
}
```

**Statuses:**
- `running` - Job in progress
- `completed` - Job finished successfully
- `failed` - Job encountered an error

**Example:**
```bash
curl http://localhost:3000/api/jobs/1
```

---

### 5. **List All Jobs**
```
GET /api/jobs
```

Get a list of all scraping jobs.

**Response:**
```json
{
  "total": 5,
  "jobs": [
    {
      "id": 1,
      "status": "completed",
      "startedAt": "...",
      "completedAt": "...",
      "products": [...]
    }
  ]
}
```

**Example:**
```bash
curl http://localhost:3000/api/jobs
```

---

### 6. **Get Job Products**
```
GET /api/jobs/:id/products
```

Get all products from a completed job.

**Response:**
```json
{
  "jobId": 1,
  "totalProducts": 50,
  "products": [
    {
      "name": "Product Name",
      "price": "£49.99",
      "rating": "4.5 stars",
      "reviews": "1,234",
      "asin": "B0XXXXXXX",
      "affiliate_link": "https://www.amazon.co.uk/dp/B0XXXXXXX/?tag=sachin920-21",
      "link": "https://www.amazon.co.uk/...",
      "image": "https://..."
    }
  ]
}
```

**Example:**
```bash
curl http://localhost:3000/api/jobs/1/products
```

---

## Integration Examples

### Python
```python
import requests

# Start scraping
response = requests.post('http://localhost:3000/api/scrape/urls', json={
    'urls': ['https://www.amazon.co.uk/s?k=laptop'],
    'affiliateTag': 'sachin920-21'
})
job_id = response.json()['jobId']

# Check status
status = requests.get(f'http://localhost:3000/api/jobs/{job_id}')
print(status.json())

# Get products when completed
products = requests.get(f'http://localhost:3000/api/jobs/{job_id}/products')
print(products.json())
```

### JavaScript/Node.js
```javascript
const axios = require('axios');

async function scrapeAmazon() {
  // Start scraping
  const { data } = await axios.post('http://localhost:3000/api/scrape/urls', {
    urls: ['https://www.amazon.co.uk/s?k=laptop'],
    affiliateTag: 'sachin920-21'
  });
  
  const jobId = data.jobId;
  
  // Poll for completion
  let status;
  do {
    await new Promise(r => setTimeout(r, 5000)); // Wait 5 seconds
    const result = await axios.get(`http://localhost:3000/api/jobs/${jobId}`);
    status = result.data.status;
  } while (status === 'running');
  
  // Get products
  const products = await axios.get(`http://localhost:3000/api/jobs/${jobId}/products`);
  console.log(products.data);
}

scrapeAmazon();
```

### cURL
```bash
# Start job
JOB_ID=$(curl -s -X POST http://localhost:3000/api/scrape/urls \
  -H "Content-Type: application/json" \
  -d '{"urls":["https://www.amazon.co.uk/s?k=laptop"]}' \
  | jq -r '.jobId')

# Check status
curl http://localhost:3000/api/jobs/$JOB_ID

# Get products
curl http://localhost:3000/api/jobs/$JOB_ID/products
```

---

## Notes

- Jobs run in the background
- Results are stored in memory (restart clears all jobs)
- Browser runs in headless mode for API calls
- Random delays prevent Amazon blocking
- All products include affiliate links automatically
