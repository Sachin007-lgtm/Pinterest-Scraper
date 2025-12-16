require('dotenv').config();

// Test the affiliate link builder
const AFFILIATE_TAG = process.env.AMAZON_AFFILIATE_TAG || 'sachin920-21';

function buildAffiliateLink(asin) {
  if (!asin || !AFFILIATE_TAG) return '';
  return `https://www.amazon.com/dp/${asin}/?tag=${AFFILIATE_TAG}`;
}

// Test with your ASIN
const testAsin = 'B0B84B58W9';
const affiliateLink = buildAffiliateLink(testAsin);

console.log('\n=== Affiliate Link Test ===');
console.log(`ASIN: ${testAsin}`);
console.log(`Affiliate Tag: ${AFFILIATE_TAG}`);
console.log(`Affiliate Link: ${affiliateLink}`);
console.log('\nExpected: https://www.amazon.com/dp/B0B84B58W9/?tag=sachin920-21');
console.log(`Match: ${affiliateLink === 'https://www.amazon.com/dp/B0B84B58W9/?tag=sachin920-21' ? '✓ YES' : '✗ NO'}`);
