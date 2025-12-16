const AmazonScraper = require('./amazonScraper');
const GoogleSheetsService = require('./googleSheetsService');
require('dotenv').config();

class AmazonAutomation {
  constructor() {
    this.scraper = new AmazonScraper();
    this.sheetsService = new GoogleSheetsService();
  }

  async run() {
    try {
      console.log('=== Amazon Product Extraction Automation ===\n');

      // Step 1: Initialize Google Sheets
      console.log('Step 1: Connecting to Google Sheets...');
      
      // Check which authentication method to use
      if (process.env.GOOGLE_REFRESH_TOKEN) {
        console.log('Using OAuth 2.0 authentication...');
        await this.sheetsService.initWithOAuth();
      } else {
        console.log('Using Service Account authentication...');
        await this.sheetsService.initWithServiceAccount();
      }

      // Step 2: Read search URLs from Google Sheet
      console.log('\nStep 2: Reading Amazon search URLs from Google Sheet...');
      
      const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
      const inputRange = process.env.INPUT_RANGE || 'Sheet1!A2:A';
      
      if (!spreadsheetId) {
        throw new Error('GOOGLE_SPREADSHEET_ID not found in .env file');
      }

      const searchUrls = await this.sheetsService.readSearchUrls(spreadsheetId, inputRange);
      
      if (searchUrls.length === 0) {
        console.log('No Amazon URLs found in the sheet. Exiting...');
        return;
      }

      console.log(`Found ${searchUrls.length} URLs to process`);

      // Step 3: Initialize browser
      console.log('\nStep 3: Initializing browser with anti-detection...');
      await this.scraper.init();

      // Step 4: Scrape products from each URL
      console.log('\nStep 4: Extracting product data...\n');
      
      const allProducts = [];
      const detailedProducts = [];

      for (let i = 0; i < searchUrls.length; i++) {
        const url = searchUrls[i];
        console.log(`\n[${i + 1}/${searchUrls.length}] Processing: ${url}`);

        try {
          // Extract search results
          const products = await this.scraper.scrapeSearchResults(url);
          
          if (products && products.length > 0) {
            allProducts.push(...products);
            console.log(`✓ Extracted ${products.length} products`);
          } else {
            console.log(`⚠ No products extracted from this search`);
          }

          // Optional: Get detailed info for first few products
          const detailLimit = parseInt(process.env.DETAIL_LIMIT) || 0;
          
          if (detailLimit > 0) {
            console.log(`Getting detailed info for top ${Math.min(detailLimit, products.length)} products...`);
            
            for (let j = 0; j < Math.min(detailLimit, products.length); j++) {
              try {
                const details = await this.scraper.scrapeProductDetails(products[j].link);
                detailedProducts.push({
                  ...products[j],
                  ...details
                });
                await this.scraper.randomDelay(3000, 5000);
              } catch (error) {
                console.error(`Error getting details for product ${j + 1}:`, error.message);
                detailedProducts.push(products[j]);
              }
            }
          }

          // Random delay between URLs to avoid detection
          if (i < searchUrls.length - 1) {
            const delay = Math.floor(Math.random() * 3000) + 5000; // 5-8 seconds
            console.log(`Waiting ${(delay / 1000).toFixed(1)}s before next URL...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }

        } catch (error) {
          console.error(`✗ Error processing URL ${i + 1}:`, error.message);
          continue;
        }
      }

      // Step 5: Write results to Google Sheet
      console.log('\n\nStep 5: Writing results to Google Sheet...');
      
      const outputSheet = process.env.OUTPUT_SHEET || 'Products';
      const productsToWrite = detailedProducts.length > 0 ? detailedProducts : allProducts;
      
      if (productsToWrite.length > 0) {
        await this.sheetsService.writeProductData(spreadsheetId, productsToWrite, outputSheet);
        await this.sheetsService.formatSheet(spreadsheetId, outputSheet);
        
        console.log(`\n✓ Successfully extracted and saved ${productsToWrite.length} products!`);
        console.log(`View your results: https://docs.google.com/spreadsheets/d/${spreadsheetId}`);
      } else {
        console.log('\n✗ No products were extracted');
      }

      // Step 6: Cleanup
      console.log('\nStep 6: Cleaning up...');
      await this.scraper.close();

      console.log('\n=== Automation Complete ===');

    } catch (error) {
      console.error('\n❌ Fatal error:', error);
      await this.scraper.close();
      process.exit(1);
    }
  }
}

// Run the automation
if (require.main === module) {
  const automation = new AmazonAutomation();
  automation.run();
}

module.exports = AmazonAutomation;
