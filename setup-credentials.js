const fs = require('fs');
const path = require('path');

// Generate credentials.json from environment variables
function setupCredentials() {
  if (!process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_CLIENT_EMAIL) {
    console.log('No credentials in environment variables, skipping setup');
    return false;
  }

  const privateKey = process.env.GOOGLE_PRIVATE_KEY
    .replace(/\\n/g, '\n')  // Handle escaped newlines
    .trim();

  const credentials = {
    type: 'service_account',
    project_id: process.env.GOOGLE_PROJECT_ID || 'linked-in-480505',
    private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID || '',
    private_key: privateKey,
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    universe_domain: 'googleapis.com'
  };

  const credPath = path.join(__dirname, 'credentials.json');
  fs.writeFileSync(credPath, JSON.stringify(credentials, null, 2));
  console.log('✅ Credentials file created successfully');
  return true;
}

setupCredentials();
