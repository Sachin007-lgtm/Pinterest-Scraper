const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config();

class AmazonScraper {
  constructor() {
    this.affiliateTag = process.env.AMAZON_AFFILIATE_TAG || '';
  }

  // Build Amazon affiliate link from ASIN
  buildAffiliateLink(asin) {
    if (!asin || !this.affiliateTag) return '';
    return `https://www.amazon.com/dp/${asin}?tag=${this.affiliateTag}`;
  }

  // Random delay to mimic human behavior
  async randomDelay(min = 8000, max = 10000) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  // Build ScraperAPI URL
  buildScraperApiUrl(targetUrl) {
    const apiKey = process.env.SCRAPER_API_KEY;
    if (!apiKey) {
      throw new Error('SCRAPER_API_KEY is required');
    }
    
    const scraperUrl =
      `https://api.scraperapi.com/?` +
      `api_key=${apiKey}` +
      `&url=${encodeURIComponent(targetUrl)}` +
      `&country_code=us` +
      `&render=true` +
      `&premium=true`;
    
    return scraperUrl;
  }

  // Validate HTML response
  validateHtml(html) {
    if (
      html.includes('cf-challenge') ||
      html.includes('Enable JavaScript') ||
      html.length < 8000
    ) {
      throw new Error('Cloudflare block detected');
    }
    return true;
  }

  // Initialize (no browser needed)
  async init() {
    console.log('✅ ScraperAPI client initialized');
  }

  // Extract product data from Amazon search results
  async scrapeSearchResults(searchUrl) {
    try {
      console.log(`🔍 Scraping via ScraperAPI: ${searchUrl}`);
      
      const scraperUrl = this.buildScraperApiUrl(searchUrl);
      
      // Fetch via ScraperAPI
      const response = await axios.get(scraperUrl, {
        timeout: 90000,
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });

      const html = response.data;
      
      // Validate response
      this.validateHtml(html);
      console.log('✅ ScraperAPI bypassed Cloudflare successfully');

      // Parse with Cheerio
      const $ = cheerio.load(html);
      const products = [];

      // Debug: Save HTML to file for inspection
      const fs = require('fs');
      fs.writeFileSync('scraped_page.html', html);
      console.log('💾 Saved HTML to scraped_page.html for debugging');

      // Try multiple selector strategies
      let items = $('[data-component-type="s-search-result"]');
      console.log(`🔍 Found ${items.length} items with [data-component-type="s-search-result"]`);
      
      if (items.length === 0) {
        items = $('.s-result-item[data-asin]');
        console.log(`🔍 Found ${items.length} items with .s-result-item[data-asin]`);
      }
      
      if (items.length === 0) {
        items = $('div[data-asin]:not([data-asin=""])');
        console.log(`🔍 Found ${items.length} items with div[data-asin]`);
      }

      items.each((index, element) => {
        try {
          const $item = $(element);
          
          // Get ASIN
          const dataAsin = $item.attr('data-asin');
          if (!dataAsin || dataAsin === '') return;

          // Product name - try multiple selectors
          let productName = '';
          productName = $item.find('h2 a span').text().trim();
          if (!productName) productName = $item.find('h2 .a-text-normal').text().trim();
          if (!productName) productName = $item.find('h2').text().trim();
          if (!productName) productName = $item.find('.a-size-medium.a-text-normal').text().trim();
          
          if (!productName) {
            console.log(`⚠️  Skipping item ${dataAsin} - no product name found`);
            return;
          }

          // Product URL and ASIN
          const productUrl = $item.find('h2 a').attr('href') || $item.find('a.a-link-normal').first().attr('href');
          let asin = dataAsin;
          
          if (productUrl && productUrl.includes('/dp/')) {
            const asinMatch = productUrl.match(/\/dp\/([A-Z0-9]{10})/);
            if (asinMatch) asin = asinMatch[1];
          }

          // Product image
          let imageUrl = $item.find('img.s-image').attr('src');
          if (!imageUrl) imageUrl = $item.find('img').first().attr('src');
          imageUrl = imageUrl || '';

          // Price - try multiple formats
          let price = '';
          const priceWhole = $item.find('.a-price-whole').first().text().trim();
          const priceFraction = $item.find('.a-price-fraction').first().text().trim();
          if (priceWhole) {
            price = `$${priceWhole}${priceFraction}`;
          } else {
            // Try alternate price selector
            const priceSymbol = $item.find('.a-price-symbol').first().text().trim();
            const priceText = $item.find('.a-price .a-offscreen').first().text().trim();
            if (priceText) price = priceText;
            else if (priceSymbol) price = priceSymbol;
          }

          // Rating
          let rating = '';
          const ratingText = $item.find('.a-icon-star-small span, .a-icon-star span').first().text();
          if (ratingText) {
            const ratingMatch = ratingText.match(/(\d+\.?\d*)/);
            if (ratingMatch) rating = ratingMatch[1];
          }

          // Review count
          let reviews = '';
          const reviewText = $item.find('span[aria-label*="stars"]').parent().parent().find('span').last().text().trim();
          if (reviewText) {
            const reviewMatch = reviewText.match(/[\d,]+/);
            if (reviewMatch) reviews = reviewMatch[0].replace(/,/g, '');
          }

          // Build affiliate link
          const affiliateLink = this.buildAffiliateLink(asin);
          const fullProductUrl = productUrl ? 
            (productUrl.startsWith('http') ? productUrl : `https://www.amazon.com${productUrl}`) : 
            `https://www.amazon.com/dp/${asin}`;

          products.push({
            productName,
            description: '', // Not available in search results
            images: imageUrl,
            price: price || 'N/A',
            rating: rating || 'N/A',
            reviews: reviews || '0',
            asin,
            affiliateLink,
            productLink: fullProductUrl,
            availability: 'In Stock',
            scrapedAt: new Date().toISOString()
          });

          console.log(`✅ Extracted: ${productName.substring(0, 50)}...`);

          // Check product limit
          const productLimit = parseInt(process.env.PRODUCT_LIMIT) || 0;
          if (productLimit > 0 && products.length >= productLimit) {
            console.log(`🛑 Reached product limit of ${productLimit}`);
            return false; // Signal to stop iteration
          }

        } catch (itemError) {
          console.warn(`⚠️  Error parsing product item: ${itemError.message}`);
        }
      });

      console.log(`✅ Extracted ${products.length} products`);

      // Rate limiting: 8-10 seconds between requests
      await this.randomDelay();

      return products;

    } catch (error) {
      console.error('Scraping error:', error.message);
      throw error;
    }
  }

  // Close (no browser to close)
  async close() {
    console.log('✅ Scraper closed');
  }
}

module.exports = AmazonScraper;
