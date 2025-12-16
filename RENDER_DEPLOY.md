# Render Deployment Guide

## Quick Deploy to Render

### 1. Create Web Service
1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub: `https://github.com/Sachin007-lgtm/Pinterest-Scraper`

### 2. Configure Service

**Build & Deploy Settings:**
- **Name:** `amazon-scraper-api`
- **Environment:** `Node`
- **Branch:** `main`
- **Build Command:** `npm install`
- **Start Command:** `node api.js`
- **Instance Type:** Choose plan (Free tier works but slower)

### 3. Add Environment Variables

Click **"Environment"** tab and add:

```
NODE_ENV=production
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
API_PORT=10000
GOOGLE_SPREADSHEET_ID=your_spreadsheet_id
AMAZON_AFFILIATE_TAG=sachin920-21
```

**For Google Sheets (choose one):**

**Option A: Service Account (Recommended)**
```
GOOGLE_CREDENTIALS_PATH=./credentials.json
```
Then add your `credentials.json` content as a file in Render.

**Option B: OAuth**
```
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REFRESH_TOKEN=your_refresh_token
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback
```

### 4. Deploy
Click **"Create Web Service"** and wait for deployment (5-10 minutes first time).

---

## Why Render Takes Time

1. **First Deploy:** Downloads and installs dependencies (~5-10 min)
2. **Puppeteer:** Uses Render's pre-installed Chromium (faster than downloading)
3. **Cold Starts:** Free tier services sleep after inactivity

**Speed Tips:**
- Use paid tier for faster instance
- Deploy takes ~5-10 min first time, then ~2-3 min for updates
- API calls might be slow on first request (cold start)

---

## Your API URL

After deployment, Render gives you a URL like:
```
https://amazon-scraper-api.onrender.com
```

---

## Test Your Deployment

```bash
curl https://your-app.onrender.com/

curl -X POST https://your-app.onrender.com/api/scrape/urls \
  -H "Content-Type: application/json" \
  -d '{"urls":["https://www.amazon.co.uk/s?k=laptop"]}'
```

---

## N8N Integration

In n8n, use **HTTP Request** node:

**Trigger Scraping:**
- Method: `POST`
- URL: `https://your-app.onrender.com/api/scrape/urls`
- Body (JSON):
```json
{
  "urls": ["{{$json.amazon_url}}"],
  "affiliateTag": "sachin920-21"
}
```

**Check Status:**
- Method: `GET`
- URL: `https://your-app.onrender.com/api/jobs/{{$json.jobId}}`

**Get Products:**
- Method: `GET`
- URL: `https://your-app.onrender.com/api/jobs/{{$json.jobId}}/products`

---

## Troubleshooting

**Deployment Stuck?**
- Check Render logs for errors
- Ensure all environment variables are set
- Free tier has limited resources

**API Not Working?**
- Check Render logs
- Test health endpoint: `GET /`
- Verify environment variables

**Scraping Fails?**
- Amazon might block Render's IPs occasionally
- Try adding delays in code
- Consider using proxy service
