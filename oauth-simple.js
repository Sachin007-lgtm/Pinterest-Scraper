const { google } = require('googleapis');
const readline = require('readline');
require('dotenv').config();

/**
 * Simplest OAuth2 Setup - Uses urn:ietf:wg:oauth:2.0:oob (no redirect needed)
 */

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'urn:ietf:wg:oauth:2.0:oob'
);

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

  console.log('\n=== Google OAuth2 Authentication (Simple Mode) ===\n');
  console.log('Step 1: Open this URL in your browser:\n');
  console.log(authUrl);
  console.log('\n');
  console.log('Step 2: After authorizing, Google will show you an authorization code.');
  console.log('        Copy that code.\n');

  rl.question('Paste the authorization code here: ', async (code) => {
    try {
      const { tokens } = await oauth2Client.getToken(code.trim());

      console.log('\n✓ Authentication successful!\n');
      console.log('='.repeat(70));
      console.log('Add this to your .env file:');
      console.log('='.repeat(70));
      console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
      console.log('='.repeat(70));
      console.log('\nYou can now run: npm start\n');

      rl.close();
      process.exit(0);
    } catch (error) {
      console.error('\n❌ Authentication failed:', error.message);
      console.error('\nMake sure you pasted the correct authorization code.');
      rl.close();
      process.exit(1);
    }
  });
}

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.error('\n❌ Error: OAuth credentials not found in .env file!');
  process.exit(1);
}

authenticate();
