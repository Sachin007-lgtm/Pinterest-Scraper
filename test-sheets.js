const GoogleSheetsService = require('./googleSheetsService');
require('dotenv').config();

async function testConnection() {
  console.log('Testing Google Sheets connection...\n');
  
  const sheetsService = new GoogleSheetsService();
  
  try {
    // Initialize
    console.log('1. Initializing with credentials.json...');
    await sheetsService.initWithServiceAccount('./credentials.json');
    console.log('✓ Connected successfully\n');
    
    // Get spreadsheet ID
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
    console.log(`2. Spreadsheet ID: ${spreadsheetId}\n`);
    
    // Try to read the sheet
    console.log('3. Reading from Sheet1!A1:A10...');
    const response = await sheetsService.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1!A1:A10'
    });
    
    console.log('✓ Data retrieved:\n');
    console.log(JSON.stringify(response.data.values, null, 2));
    console.log('\n');
    
    // Check for Amazon URLs
    const urls = response.data.values
      ?.flat()
      .filter(url => url && url.includes('amazon'));
    
    console.log(`Found ${urls?.length || 0} rows with "amazon" in them:`);
    urls?.forEach((url, i) => console.log(`  ${i + 1}. ${url}`));
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code === 403) {
      console.error('\nPermission denied! Make sure you:');
      console.error('1. Shared the Google Sheet with: pinterest141@linked-in-480505.iam.gserviceaccount.com');
      console.error('2. Gave it "Editor" permissions');
    }
  }
}

testConnection();
