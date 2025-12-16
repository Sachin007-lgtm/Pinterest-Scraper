const GoogleSheetsService = require('./googleSheetsService');
require('dotenv').config();

async function testWrite() {
  console.log('Testing Google Sheets WRITE access...\n');
  
  const sheetsService = new GoogleSheetsService();
  
  try {
    await sheetsService.initWithServiceAccount('./credentials.json');
    console.log('✓ Connected\n');
    
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
    
    // Test data
    const testProducts = [
      {
        name: 'Test Product 1',
        description: 'This is a test',
        images: ['http://example.com/image1.jpg'],
        price: '$29.99',
        rating: '4.5 stars',
        reviews: '100 reviews',
        link: 'http://example.com/product1',
        asin: 'B001234567',
        availability: 'In Stock'
      }
    ];
    
    console.log('Writing test data to "Products" sheet...');
    await sheetsService.writeProductData(spreadsheetId, testProducts, 'Products');
    
    console.log('\n✓ Success! Check your Google Sheet:');
    console.log(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`);
    console.log('\nLook for the "Products" tab at the bottom.\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code === 403) {
      console.error('\nMake sure the service account has EDITOR permissions!');
    }
  }
}

testWrite();
