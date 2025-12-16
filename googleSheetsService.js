const { google } = require('googleapis');
const path = require('path');
require('dotenv').config();

class GoogleSheetsService {
  constructor() {
    this.auth = null;
    this.sheets = null;
  }

  // Initialize Google Sheets API with service account
  async initWithServiceAccount(credentialsPath) {
    try {
      // Try environment variables first (for Render deployment)
      if (process.env.GOOGLE_PRIVATE_KEY && process.env.GOOGLE_CLIENT_EMAIL) {
        console.log('Using environment variables for service account');
        const auth = new google.auth.GoogleAuth({
          credentials: {
            type: 'service_account',
            project_id: process.env.GOOGLE_PROJECT_ID,
            private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            client_email: process.env.GOOGLE_CLIENT_EMAIL,
            client_id: process.env.GOOGLE_CLIENT_ID || '',
            auth_uri: 'https://accounts.google.com/o/oauth2/auth',
            token_uri: 'https://oauth2.googleapis.com/token',
            auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs'
          },
          scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });

        this.auth = await auth.getClient();
        this.sheets = google.sheets({ version: 'v4', auth: this.auth });
        console.log('Google Sheets API initialized with service account (env vars)');
      } else {
        // Fall back to credentials file
        const auth = new google.auth.GoogleAuth({
          keyFile: credentialsPath,
          scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });

        this.auth = await auth.getClient();
        this.sheets = google.sheets({ version: 'v4', auth: this.auth });
        console.log('Google Sheets API initialized with service account (file)');
      }
    } catch (error) {
      console.error('Error initializing Google Sheets API:', error);
      throw error;
    }
  }

  // Initialize with OAuth2 (alternative method)
  async initWithOAuth() {
    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      oauth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN
      });

      this.auth = oauth2Client;
      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      console.log('Google Sheets API initialized with OAuth2');
    } catch (error) {
      console.error('Error initializing Google Sheets API with OAuth:', error);
      throw error;
    }
  }

  // Read search URLs from Google Sheet
  async readSearchUrls(spreadsheetId, range = 'Sheet1!A:A') {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        console.log('No data found in the sheet');
        return [];
      }

      // Extract URLs (skip header row and filter for Amazon URLs)
      const urls = rows
        .flat()
        .filter(url => url && typeof url === 'string' && url.includes('amazon.com') && url.startsWith('http'))
        .map(url => url.trim());

      console.log(`Found ${urls.length} Amazon URLs in the sheet`);
      return urls;

    } catch (error) {
      console.error('Error reading from Google Sheets:', error);
      throw error;
    }
  }

  // Write product data to Google Sheet
  async writeProductData(spreadsheetId, products, sheetName = 'Products') {
    try {
      // Create header row
      const headers = [
        'Product Name',
        'Description',
        'Images',
        'Price',
        'Rating',
        'Reviews',
        'ASIN',
        'Affiliate Link',
        'Product Link',
        'Availability',
        'Scraped At'
      ];

      // Prepare data rows - MUST match header order!
      const rows = products.map(product => [
        product.name || product.title || '',
        product.description || '',
        Array.isArray(product.images) ? product.images.join(', ') : product.image || '',
        product.price || '',
        product.rating || '',
        product.reviews || '',
        product.asin || '',
        product.affiliate_link || '',
        product.link || '',
        product.availability || '',
        new Date().toISOString()
      ]);

      // Combine headers and data
      const values = [headers, ...rows];

      // Check if sheet exists, create if not
      try {
        await this.sheets.spreadsheets.get({
          spreadsheetId,
          ranges: [sheetName]
        });
      } catch (error) {
        // Sheet doesn't exist, create it
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          resource: {
            requests: [{
              addSheet: {
                properties: {
                  title: sheetName
                }
              }
            }]
          }
        });
        console.log(`Created new sheet: ${sheetName}`);
      }

      // Write data to sheet
      const response = await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'RAW',
        resource: {
          values
        }
      });

      console.log(`Written ${products.length} products to sheet: ${sheetName}`);
      return response.data;

    } catch (error) {
      console.error('Error writing to Google Sheets:', error);
      throw error;
    }
  }

  // Append product data to existing sheet (without overwriting)
  async appendProductData(spreadsheetId, products, sheetName = 'Products') {
    try {
      // Prepare data rows - MUST match header order!
      const rows = products.map(product => [
        product.name || product.title || '',
        product.description || '',
        Array.isArray(product.images) ? product.images.join(', ') : product.image || '',
        product.price || '',
        product.rating || '',
        product.reviews || '',
        product.asin || '',
        product.affiliate_link || '',
        product.link || '',
        product.availability || '',
        new Date().toISOString()
      ]);

      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A:A`,
        valueInputOption: 'RAW',
        resource: {
          values: rows
        }
      });

      console.log(`Appended ${products.length} products to sheet: ${sheetName}`);
      return response.data;

    } catch (error) {
      console.error('Error appending to Google Sheets:', error);
      throw error;
    }
  }

  // Format sheet with colors and styles
  async formatSheet(spreadsheetId, sheetName = 'Products') {
    try {
      // Get sheet ID
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId
      });

      const sheet = spreadsheet.data.sheets.find(s => s.properties.title === sheetName);
      if (!sheet) {
        console.log('Sheet not found for formatting');
        return;
      }

      const sheetId = sheet.properties.sheetId;

      // Apply formatting
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [
            {
              // Bold header row
              repeatCell: {
                range: {
                  sheetId,
                  startRowIndex: 0,
                  endRowIndex: 1
                },
                cell: {
                  userEnteredFormat: {
                    textFormat: {
                      bold: true
                    },
                    backgroundColor: {
                      red: 0.2,
                      green: 0.2,
                      blue: 0.8
                    },
                    textFormat: {
                      foregroundColor: {
                        red: 1.0,
                        green: 1.0,
                        blue: 1.0
                      },
                      bold: true
                    }
                  }
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat)'
              }
            },
            {
              // Auto-resize columns
              autoResizeDimensions: {
                dimensions: {
                  sheetId,
                  dimension: 'COLUMNS',
                  startIndex: 0,
                  endIndex: 10
                }
              }
            },
            {
              // Freeze header row
              updateSheetProperties: {
                properties: {
                  sheetId,
                  gridProperties: {
                    frozenRowCount: 1
                  }
                },
                fields: 'gridProperties.frozenRowCount'
              }
            }
          ]
        }
      });

      console.log('Sheet formatted successfully');
    } catch (error) {
      console.error('Error formatting sheet:', error);
    }
  }
}

module.exports = GoogleSheetsService;
