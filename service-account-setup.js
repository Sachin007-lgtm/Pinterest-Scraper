/**
 * SERVICE ACCOUNT SETUP GUIDE
 * This is the EASIEST method - no OAuth verification needed!
 */

console.log('\n=== Google Sheets Service Account Setup ===\n');
console.log('Follow these steps to get your credentials:\n');

console.log('Step 1: Go to Google Cloud Console');
console.log('  → https://console.cloud.google.com/\n');

console.log('Step 2: Select your project (or create a new one)\n');

console.log('Step 3: Enable Google Sheets API');
console.log('  → Go to "APIs & Services" > "Library"');
console.log('  → Search for "Google Sheets API"');
console.log('  → Click "Enable"\n');

console.log('Step 4: Create Service Account');
console.log('  → Go to "APIs & Services" > "Credentials"');
console.log('  → Click "Create Credentials" > "Service Account"');
console.log('  → Enter a name (e.g., "amazon-scraper")');
console.log('  → Click "Create and Continue"');
console.log('  → Skip optional steps, click "Done"\n');

console.log('Step 5: Create and Download Key');
console.log('  → Click on the service account you just created');
console.log('  → Go to "Keys" tab');
console.log('  → Click "Add Key" > "Create New Key"');
console.log('  → Choose "JSON"');
console.log('  → Click "Create"');
console.log('  → Save the downloaded file as "credentials.json" in this folder\n');

console.log('Step 6: Share Your Google Sheet');
console.log('  → Open the downloaded credentials.json file');
console.log('  → Copy the "client_email" value (looks like: xxx@xxx.iam.gserviceaccount.com)');
console.log('  → Open your Google Sheet');
console.log('  → Click "Share"');
console.log('  → Paste the service account email');
console.log('  → Give "Editor" permissions');
console.log('  → Click "Share"\n');

console.log('Step 7: Update your .env file');
console.log('  → Comment out or remove OAuth credentials');
console.log('  → Add: GOOGLE_CREDENTIALS_PATH=./credentials.json\n');

console.log('Step 8: Run your scraper');
console.log('  → npm start\n');

console.log('='.repeat(70));
console.log('✓ Service Account = No OAuth verification needed!');
console.log('✓ More reliable for automation');
console.log('✓ No browser authentication required');
console.log('='.repeat(70));
console.log('\n');
