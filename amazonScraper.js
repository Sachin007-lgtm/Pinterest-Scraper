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

      // Extract products using multiple selector strategies
      $('[data-component-type="s-search-result"], .s-result-item').each((index, element) => {
        try {
          const $item = $(element);
          
          // Skip sponsored or invalid items
          const dataAsin = $item.attr('data-asin');
          if (!dataAsin || dataAsin === '') return;

          // Product name
          const nameElement = $item.find('h2 a span, h2 .a-text-normal');
          const productName = nameElement.first().text().trim();
          if (!productName) return;

          // Product URL and ASIN
          const productUrl = $item.find('h2 a').attr('href');
          let asin = dataAsin;
          
          if (productUrl && productUrl.includes('/dp/')) {
            const asinMatch = productUrl.match(/\/dp\/([A-Z0-9]{10})/);
            if (asinMatch) asin = asinMatch[1];
          }

          // Product image
          const imageUrl = $item.find('img.s-image').attr('src') || '';

          // Price
          let price = '';
          const priceWhole = $item.find('.a-price-whole').first().text().trim();
          const priceFraction = $item.find('.a-price-fraction').first().text().trim();
          if (priceWhole) {
            price = `$${priceWhole}${priceFraction}`;
          }

          // Rating
          let rating = '';
          const ratingText = $item.find('.a-icon-star-small .a-icon-alt, .a-icon-star .a-icon-alt').first().text();
          if (ratingText) {
            const ratingMatch = ratingText.match(/(\d+\.?\d*)/);
            if (ratingMatch) rating = ratingMatch[1];
          }

          // Review count
          let reviews = '';
          const reviewText = $item.find('[href*="#customerReviews"]').first().text().trim();
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

        } catch (itemError) {
          console.warn(`Error parsing product item: ${itemError.message}`);
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
