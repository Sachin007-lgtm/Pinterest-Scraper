# Amazon Product Scraper with Google Sheets Integration

An automated tool to extract Amazon product data from search URLs stored in Google Sheets. Built with Puppeteer and includes anti-ban measures.

## Features

✅ **Google Sheets Integration** - Read search URLs from Google Sheets and write results back
✅ **Anti-Detection Measures** - Puppeteer Stealth plugin, random delays, realistic headers
✅ **Product Data Extraction**:
  - Product name
  - Description
  - Images (multiple)
  - Price
  - Rating & reviews
  - ASIN
  - Availability
  - Product link

✅ **Detailed Product Scraping** - Optional deep scraping for individual product pages
✅ **Formatted Output** - Results written to Google Sheets with headers and styling

## Prerequisites

- Node.js (v14 or higher)
- Google Cloud Project with Sheets API enabled
- OAuth 2.0 Client ID credentials (recommended) OR Service Account credentials

## Installation

1. **Clone or navigate to the project directory**

2. **Install dependencies**
```bash
npm install
```

3. **Set up Google Sheets API**

   ### OPTION A: OAuth 2.0 (Recommended - Easier)
   
   a. Go to [Google Cloud Console](https://console.cloud.google.com/)
   
   b. Create a new project or select existing one
   
   c. Enable Google Sheets API:
      - Go to "APIs & Services" > "Library"
      - Search for "Google Sheets API"
      - Click "Enable"
   
   d. If you already have OAuth 2.0 Client ID:
      - Go to "APIs & Services" > "Credentials"
      - Find your OAuth 2.0 Client ID
      - Copy the Client ID and Client Secret
   
   e. If you need to create OAuth 2.0 Client ID:
      - Go to "APIs & Services" > "Credentials"
      - Click "Create Credentials" > "OAuth Client ID"
      - Choose "Web application"
      - Add authorized redirect URI: `http://localhost:3000/oauth2callback`
      - Copy the Client ID and Client Secret
   
   ### OPTION B: Service Account (Alternative)
   
   a-c. Same as Option A above
   
   d. Create Service Account:
      - Go to "APIs & Services" > "Credentials"
      - Click "Create Credentials" > "Service Account"
      - Fill in details and create
      - Click on the service account
      - Go to "Keys" tab
      - Click "Add Key" > "Create New Key"
      - Choose JSON format
      - Download the file and save as `credentials.json` in project root
   
   e. Share your Google Sheet with the service account email
      - Open your Google Sheet
      - Click "Share"
      - Add the service account email (found in credentials.json)
      - Give "Editor" permissions

4. **Configure environment variables**
```bash
cp .env.example .env
```

Edit `.env` file with your settings:

**For OAuth 2.0:**
```env
GOOGLE_SPREADSHEET_ID=your_spreadsheet_id_from_url
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback
GOOGLE_REFRESH_TOKEN=get_this_from_next_step
INPUT_RANGE=Sheet1!A:A
OUTPUT_SHEET=Products
DETAIL_LIMIT=0
```

**For Service Account:**
```env
GOOGLE_SPREADSHEET_ID=your_spreadsheet_id_from_url
GOOGLE_CREDENTIALS_PATH=./credentials.json
INPUT_RANGE=Sheet1!A:A
OUTPUT_SHEET=Products
DETAIL_LIMIT=0
```

5. **Authenticate (OAuth 2.0 only)**

If using OAuth, run the setup script to get your refresh token:
```bash
npm run oauth-setup
```

This will:
- Open your browser for Google authentication
- Display your refresh token
- Add the refresh token to your `.env` file

## Google Sheet Setup

1. **Input Sheet Structure**

Your Google Sheet should have Amazon search URLs in column A:

| A (URLs) |
|----------|
| https://www.amazon.com/s?k=laptop |
| https://www.amazon.com/s?k=headphones |
| https://www.amazon.com/s?k=keyboard |

2. **Get Spreadsheet ID**

From your Google Sheets URL:
```
https://docs.google.com/spreadsheets/d/1ABC123def456GHI789/edit
                                      ^^^^^^^^^^^^^^^^^^^
                                      This is your ID
```

## Usage

Run the automation:

```bash
npm start
```

The script will:
1. Connect to Google Sheets
2. Read all Amazon search URLs from your sheet
3. Launch browser with anti-detection measures
4. Scrape product data from each URL
5. Write results to a new sheet called "Products"
6. Format the output with headers and styling

## Configuration Options

### DETAIL_LIMIT
- `0` (default): Only extract search result data (faster)
- `3`: Get detailed info for first 3 products from each search URL
- Higher numbers = more detailed data but slower execution

### Anti-Ban Features

The scraper includes several measures to avoid detection:
- ✅ Puppeteer Stealth plugin
- ✅ Random delays between actions (1-3 seconds)
- ✅ Realistic user agent strings
- ✅ Browser fingerprint masking
- ✅ Random delays between URL processing (5-8 seconds)
- ✅ Network idle waiting
- ✅ Headless mode optional

## Output Format

Results are written to Google Sheets with these columns:

| Column | Description |
|--------|-------------|
| Product Name | Title of the product |
| Description | Product features/description |
| Images | Comma-separated image URLs |
| Price | Product price |
| Rating | Star rating |
| Reviews | Number of reviews |
| Link | Product page URL |
| ASIN | Amazon product identifier |
| Availability | Stock status |
| Scraped At | Timestamp |

## Troubleshooting

### "GOOGLE_SPREADSHEET_ID not found"
- Make sure you've created a `.env` file and added your spreadsheet ID

### "Permission denied" or "Unable to read sheet"
- Ensure you've shared your Google Sheet with the service account email

### "No Amazon URLs found"
- Check that your URLs are in column A of the specified sheet
- Verify the INPUT_RANGE in `.env` file

### Browser not launching
- Install required dependencies:
  ```bash
  npm install
  ```
- On Linux, you may need additional libraries

### Getting blocked by Amazon
- Increase delay times in code
- Reduce DETAIL_LIMIT
- Use residential proxies (advanced)
- Process fewer URLs at once

## Best Practices

1. **Rate Limiting**: Don't scrape too aggressively. The script includes delays, but consider:
   - Processing during off-peak hours
   - Smaller batches of URLs
   - Longer delays between requests

2. **Headless Mode**: For production, set `headless: true` in `amazonScraper.js`

3. **Error Handling**: The script continues even if one URL fails

4. **Data Validation**: Always review extracted data for accuracy

## Project Structure

```
├── index.js                   # Main automation script
├── amazonScraper.js          # Amazon scraping logic
├── googleSheetsService.js    # Google Sheets integration
├── package.json              # Dependencies
├── .env                      # Configuration (create from .env.example)
├── .env.example              # Configuration template
├── credentials.json          # Google service account (you need to create)
└── README.md                 # This file
```

## Legal & Ethics

⚠️ **Important**: 
- Web scraping may violate Amazon's Terms of Service
- Use responsibly and respect rate limits
- Consider using Amazon's official Product Advertising API for commercial use
- This tool is for educational purposes

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review your configuration in `.env`
3. Verify Google Sheets permissions
4. Check console logs for specific errors

## License

ISC
