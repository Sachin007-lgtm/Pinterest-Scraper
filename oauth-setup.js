const { google } = require('googleapis');
const readline = require('readline');
require('dotenv').config();

/**
 * OAuth2 Authentication Helper - Manual Mode
 * This bypasses the "Access blocked" issue by using manual code entry
 */

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost'
);

// Scopes for Google Sheets access
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function authenticate() {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });

  console.log('\n=== Google OAuth2 Authentication (Manual Mode) ===\n');
  console.log('Step 1: Copy and paste this URL into your browser:\n');
  console.log(authUrl);
  console.log('\n');
  console.log('Step 2: You may see "Access blocked" or a warning.');
  console.log('        Click "Advanced" or "Go to [app name] (unsafe)"');
  console.log('        This is safe - it\'s your own app!\n');
  console.log('Step 3: After authorizing, Google will redirect you to a page that');
  console.log('        says "localhost refused to connect" or similar.');
  console.log('        Look at the URL in the address bar.\n');
  console.log('Step 4: Copy the ENTIRE URL from your browser and paste it below.\n');

  rl.question('Paste the full redirect URL here: ', async (redirectUrl) => {
    try {
      // Extract code from URL
      const urlObj = new URL(redirectUrl);
      const code = urlObj.searchParams.get('code');

      if (!code) {
        console.error('\n❌ No authorization code found in URL. Please try again.');
        process.exit(1);
      }

      // Exchange code for tokens
      const { tokens } = await oauth2Client.getToken(code);

      console.log('\n✓ Authentication successful!\n');
      console.log('='.repeat(70));
      console.log('Copy this line and add it to your .env file:');
      console.log('='.repeat(70));
      console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
      console.log('='.repeat(70));
      console.log('\nYour .env file should now have:');
      console.log(`  GOOGLE_CLIENT_ID=${process.env.GOOGLE_CLIENT_ID}`);
      console.log(`  GOOGLE_CLIENT_SECRET=${process.env.GOOGLE_CLIENT_SECRET}`);
      console.log(`  GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
      console.log('\nYou can now run: npm start\n');

      rl.close();
      process.exit(0);
    } catch (error) {
      console.error('\n❌ Authentication failed:', error.message);
      console.error('\nMake sure you pasted the complete URL from the browser.');
      rl.close();
      process.exit(1);
    }
  });
}

// Check if credentials are provided
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.error('\n❌ Error: OAuth credentials not found!');
  console.error('\nPlease add to your .env file:');
  console.error('GOOGLE_CLIENT_ID=your_client_id');
  console.error('GOOGLE_CLIENT_SECRET=your_client_secret\n');
  process.exit(1);
}

// Run authentication
authenticate();
