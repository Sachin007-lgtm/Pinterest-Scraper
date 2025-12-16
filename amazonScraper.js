const puppeteer = require('puppeteer-extra');
const puppeteerCore = require('puppeteer-core');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Add stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

class AmazonScraper {
  constructor() {
    this.browser = null;
    this.page = null;
    this.affiliateTag = process.env.AMAZON_AFFILIATE_TAG || '';
  }

  // Build Amazon affiliate link from ASIN
  buildAffiliateLink(asin) {
    if (!asin || !this.affiliateTag) return '';
    return `https://www.amazon.com/dp/${asin}?tag=${this.affiliateTag}`;
  }

  // Random delay to mimic human behavior
  async randomDelay(min = 1000, max = 3000) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  // Build ScraperAPI URL
  buildScraperApiUrl(targetUrl) {
    const apiKey = process.env.SCRAPER_API_KEY;
    if (!apiKey) {
      console.warn('⚠️  SCRAPER_API_KEY not set, using direct connection (may get blocked)');
      return targetUrl;
    }
    
    return `http://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(targetUrl)}&country_code=us&render=true`;
  }

  // Validate HTML response
  validateHtml(html) {
    if (
      html.includes('cf-challenge') ||
      html.includes('Enable JavaScript') ||
      html.length < 5000
    ) {
      throw new Error('🚫 Blocked or invalid HTML detected (Cloudflare/Bot check)');
    }
    return true;
  }

  // Initialize browser with anti-detection settings
  async init() {
    const isProduction = process.env.NODE_ENV === 'production';
    
    this.browser = await puppeteer.launch({
      headless: isProduction ? 'new' : false, // Headless in production
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1920,1080',
        '--lang=en-GB,en',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer'
      ]
    });

    this.page = await this.browser.newPage();
    
    // Set viewport
    await this.page.setViewport({
      width: 1920,
      height: 1080
    });

    // Set consistent realistic user agent
    await this.page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Set additional headers
    await this.page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Charset': 'UTF-8'
    });

    console.log('Browser initialized with anti-detection measures');
  }

  // Extract product data from Amazon search results
  async scrapeSearchResults(searchUrl) {
    try {
      // Extract search term from URL
      const urlObj = new URL(searchUrl);
      const searchTerm = urlObj.searchParams.get('k') || urlObj.searchParams.get('field-keywords');

      if (!searchTerm) {
        console.log('Direct URL navigation via ScraperAPI...');
        const scraperUrl = this.buildScraperApiUrl(searchUrl);
        await this.page.goto(scraperUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 90000
        });
        
        // Rate limiting: 8 seconds between requests
        await new Promise(resolve => setTimeout(resolve, 8000));
        
        // Validate response
        const html = await this.page.content();
        this.validateHtml(html);
      } else {
        // Navigate to Amazon search via ScraperAPI
        console.log('Navigating to Amazon search via ScraperAPI...');
        const scraperUrl = this.buildScraperApiUrl(searchUrl);
        
        await this.page.goto(scraperUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 90000
        });
        
        // Rate limiting: 8 seconds between requests
        await new Promise(resolve => setTimeout(resolve, 8000));
        
        // Validate response
        const html = await this.page.content();
        this.validateHtml(html);
      }

      console.log('✅ ScraperAPI bypassed Cloudflare successfully');
      await this.randomDelay(2000, 3000);

      // Wait for products to load with fallback
      try {
        await this.page.waitForSelector('[data-component-type="s-search-result"]', {
          timeout: 10000
        });
      } catch (e) {
        // Fallback selector
        await this.page.waitForSelector('.s-result-item', { timeout: 10000 });
      }

      console.log('Products loaded, extracting data...');

      // Take screenshot for debugging
      await this.page.screenshot({ path: 'search_results.png' });

      // Extract product links first (more reliable)
      const productLinks = await this.page.evaluate(() => {
        let links = [];
        // Try primary selector
        const elements = document.querySelectorAll('.s-result-item h2 a');
        if (elements.length > 0) {
          links = Array.from(elements).map(link => ({
            url: link.href,
            title: link.innerText.trim()
          }));
        } else {
          // Try fallback selector
          const fallback = document.querySelectorAll('a.a-link-normal.s-underline-text');
          links = Array.from(fallback).map(link => ({
            url: link.href,
            title: link.innerText.trim()
          }));
        }
        return links.filter(item => item.url.includes('/dp/') && !item.url.includes('/slredirect/'));
      });

      console.log(`Found ${productLinks.length} product links`);

      // Extract data from search results using multiple selector strategies
      const products = await this.page.evaluate(() => {
        const results = [];
        
        // Strategy 1: Try data-component-type selector
        let productElements = document.querySelectorAll('[data-component-type="s-search-result"]');
        
        // Strategy 2: Fallback to s-result-item
        if (productElements.length === 0) {
          productElements = document.querySelectorAll('.s-result-item[data-asin]:not([data-asin=""])');
        }

        productElements.forEach((element) => {
          try {
            // Get ASIN first
            const asin = element.getAttribute('data-asin') || '';
            if (!asin) return; // Skip if no ASIN

            // Product name - try multiple selectors
            let name = '';
            const nameSelectors = [
              'h2 a span',
              'h2 span',
              '.s-title-instructions-style h2 span',
              '.a-size-medium.a-text-normal'
            ];
            for (const selector of nameSelectors) {
              const el = element.querySelector(selector);
              if (el && el.textContent.trim()) {
                name = el.textContent.trim();
                break;
              }
            }

            // Product link
            const linkElement = element.querySelector('h2 a, .s-title-instructions-style a');
            const link = linkElement ? linkElement.getAttribute('href') : '';

            // Product image
            const imgElement = element.querySelector('img.s-image, .s-image img');
            const image = imgElement ? (imgElement.getAttribute('src') || imgElement.getAttribute('data-src')) : '';

            // Product price
            const priceElement = element.querySelector('.a-price .a-offscreen, .a-price-whole');
            const price = priceElement ? priceElement.textContent.trim() : 'N/A';

            // Product rating
            const ratingElement = element.querySelector('.a-icon-alt, [aria-label*="out of"]');
            const rating = ratingElement ? (ratingElement.textContent || ratingElement.getAttribute('aria-label')).trim() : 'N/A';

            // Number of reviews
            const reviewsElement = element.querySelector('.a-size-base.s-underline-text, [aria-label*="stars"] + span');
            const reviews = reviewsElement ? reviewsElement.textContent.trim() : 'N/A';

            if (name && link) {
              results.push({
                name,
                link: link.startsWith('http') ? link : 'https://www.amazon.com' + link,
                image,
                price,
                rating,
                reviews,
                asin,
                affiliate_link: asin // Will be built later with affiliateTag
              });
            }
          } catch (err) {
            // Silent fail for individual items
          }
        });

        return results;
      });

      // Add affiliate links to all products
      products.forEach(product => {
        if (product.asin) {
          product.affiliate_link = this.buildAffiliateLink(product.asin);
        }
      });

      console.log(`Extracted ${products.length} products`);
      return products;

    } catch (error) {
      console.error('Error scraping search results:', error);
      throw error;
    }
  }

  // Get detailed product information from product page
  async scrapeProductDetails(productUrl) {
    try {
      console.log(`Fetching product details from: ${productUrl}`);
      
      await this.page.goto(productUrl, {
        waitUntil: 'networkidle2',
        timeout: 60000
      });

      await this.randomDelay(2000, 4000);

      const productDetails = await this.page.evaluate(() => {
        // Product title
        const titleElement = document.querySelector('#productTitle');
        const title = titleElement ? titleElement.textContent.trim() : '';

        // Product description (feature bullets)
        const descriptionElements = document.querySelectorAll('#feature-bullets ul li span.a-list-item');
        const description = Array.from(descriptionElements)
          .map(el => el.textContent.trim())
          .filter(text => text.length > 0)
          .join(' | ');

        // Product images
        const imageElements = document.querySelectorAll('#altImages img');
        const images = Array.from(imageElements)
          .map(img => img.getAttribute('src'))
          .filter(src => src && !src.includes('transparent-pixel'))
          .slice(0, 5); // Get first 5 images

        // Main image
        const mainImageElement = document.querySelector('#landingImage');
        const mainImage = mainImageElement ? mainImageElement.getAttribute('src') : '';
        
        if (mainImage && !images.includes(mainImage)) {
          images.unshift(mainImage);
        }

        // Price
        const priceElement = document.querySelector('.a-price .a-offscreen');
        const price = priceElement ? priceElement.textContent.trim() : 'N/A';

        // Rating
        const ratingElement = document.querySelector('#acrPopover');
        const rating = ratingElement ? ratingElement.getAttribute('title') : 'N/A';

        // Reviews count
        const reviewsElement = document.querySelector('#acrCustomerReviewText');
        const reviews = reviewsElement ? reviewsElement.textContent.trim() : 'N/A';

        // Availability
        const availabilityElement = document.querySelector('#availability span');
        const availability = availabilityElement ? availabilityElement.textContent.trim() : 'N/A';

        return {
          title,
          description,
          images,
          price,
          rating,
          reviews,
          availability
        };
      });

      console.log('Product details extracted successfully');
      return productDetails;

    } catch (error) {
      console.error('Error scraping product details:', error);
      throw error;
    }
  }

  // Close browser
  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('Browser closed');
    }
  }
}

module.exports = AmazonScraper;
