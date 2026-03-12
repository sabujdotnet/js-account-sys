/**
 * Google Drive Integration Service
 * Handles backup to Google Drive
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { query } = require('../config/database');
const logger = require('../utils/logger');

// Google Drive API configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/backup/google/callback';

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

/**
 * Get Google Drive authorization URL
 */
function getAuthUrl(userId) {
  const scopes = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.appdata',
  ];
  
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
    state: userId,
  });
  
  return url;
}

/**
 * Exchange code for tokens
 */
async function exchangeCodeForTokens(code) {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
  } catch (error) {
    logger.error('Exchange code error:', error);
    throw error;
  }
}

/**
 * Save tokens to database
 */
async function saveTokens(userId, tokens) {
  try {
    // Check if tokens exist
    const existing = await query(
      'SELECT id FROM drive_tokens WHERE user_id = $1',
      [userId]
    );
    
    if (existing.rows.length > 0) {
      // Update existing tokens
      await query(
        `UPDATE drive_tokens 
         SET access_token = $1, 
             refresh_token = $2, 
             expiry_date = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $4`,
        [
          tokens.access_token,
          tokens.refresh_token,
          new Date(tokens.expiry_date),
          userId,
        ]
      );
    } else {
      // Insert new tokens
      await query(
        `INSERT INTO drive_tokens (user_id, access_token, refresh_token, expiry_date)
         VALUES ($1, $2, $3, $4)`,
        [
          userId,
          tokens.access_token,
          tokens.refresh_token,
          new Date(tokens.expiry_date),
        ]
      );
    }
    
    logger.info(`Google Drive tokens saved for user: ${userId}`);
  } catch (error) {
    logger.error('Save tokens error:', error);
    throw error;
  }
}

/**
 * Get tokens from database
 */
async function getTokens(userId) {
  try {
    const result = await query(
      'SELECT * FROM drive_tokens WHERE user_id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
  } catch (error) {
    logger.error('Get tokens error:', error);
    return null;
  }
}

/**
 * Refresh access token
 */
async function refreshAccessToken(userId) {
  try {
    const tokens = await getTokens(userId);
    
    if (!tokens) {
      throw new Error('No tokens found');
    }
    
    oauth2Client.setCredentials({
      refresh_token: tokens.refresh_token,
    });
    
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    // Save new access token
    await query(
      `UPDATE drive_tokens 
       SET access_token = $1, 
           expiry_date = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $3`,
      [
        credentials.access_token,
        new Date(credentials.expiry_date),
        userId,
      ]
    );
    
    return credentials.access_token;
  } catch (error) {
    logger.error('Refresh token error:', error);
    throw error;
  }
}

/**
 * Get authorized drive client
 */
async function getDriveClient(userId) {
  try {
    const tokens = await getTokens(userId);
    
    if (!tokens) {
      throw new Error('Google Drive not connected');
    }
    
    // Check if token is expired
    const now = new Date();
    const expiryDate = new Date(tokens.expiry_date);
    
    let accessToken = tokens.access_token;
    
    if (now >= expiryDate) {
      accessToken = await refreshAccessToken(userId);
    }
    
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: tokens.refresh_token,
    });
    
    return google.drive({ version: 'v3', auth: oauth2Client });
  } catch (error) {
    logger.error('Get drive client error:', error);
    throw error;
  }
}

/**
 * Create backup folder in Google Drive
 */
async function createBackupFolder(drive, folderName = 'JS Accounting BD Backups') {
  try {
    // Check if folder exists
    const response = await drive.files.list({
      q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      spaces: 'drive',
    });
    
    if (response.data.files.length > 0) {
      return response.data.files[0].id;
    }
    
    // Create folder
    const fileMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    };
    
    const folder = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id',
    });
    
    logger.info(`Backup folder created: ${folder.data.id}`);
    return folder.data.id;
  } catch (error) {
    logger.error('Create backup folder error:', error);
    throw error;
  }
}

/**
 * Backup file to Google Drive
 */
async function backupFileToDrive(userId, filePath, fileName) {
  try {
    const drive = await getDriveClient(userId);
    const folderId = await createBackupFolder(drive);
    
    const fileMetadata = {
      name: fileName,
      parents: [folderId],
    };
    
    const media = {
      mimeType: 'application/json',
      body: fs.createReadStream(filePath),
    };
    
    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink',
    });
    
    logger.info(`File backed up to Google Drive: ${file.data.id}`);
    
    return {
      id: file.data.id,
      name: file.data.name,
      webViewLink: file.data.webViewLink,
    };
  } catch (error) {
    logger.error('Backup to drive error:', error);
    throw error;
  }
}

/**
 * Backup database data to Google Drive
 */
async function backupDatabaseToDrive(userId) {
  try {
    // Get user's data
    const transactions = await query(
      'SELECT * FROM transactions WHERE user_id = $1',
      [userId]
    );
    
    const workers = await query(
      'SELECT * FROM workers WHERE user_id = $1',
      [userId]
    );
    
    const laborPayments = await query(
      'SELECT * FROM labor_payments WHERE user_id = $1',
      [userId]
    );
    
    const invoices = await query(
      'SELECT * FROM invoices WHERE user_id = $1',
      [userId]
    );
    
    // Create backup object
    const backupData = {
      version: '1.0',
      createdAt: new Date().toISOString(),
      userId,
      data: {
        transactions: transactions.rows,
        workers: workers.rows,
        laborPayments: laborPayments.rows,
        invoices: invoices.rows,
      },
    };
    
    // Save to temp file
    const tempDir = path.join(__dirname, '../../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `js-accounting-backup-${timestamp}.json`;
    const filePath = path.join(tempDir, fileName);
    
    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));
    
    // Upload to Google Drive
    const result = await backupFileToDrive(userId, filePath, fileName);
    
    // Clean up temp file
    fs.unlinkSync(filePath);
    
    // Update photos with Google Drive ID if needed
    await updatePhotoDriveIds(userId, drive);
    
    return result;
  } catch (error) {
    logger.error('Database backup error:', error);
    throw error;
  }
}

/**
 * Upload photos to Google Drive
 */
async function uploadPhotosToDrive(userId) {
  try {
    const drive = await getDriveClient(userId);
    
    // Create photos folder
    const folderMetadata = {
      name: 'JS Accounting Photos',
      mimeType: 'application/vnd.google-apps.folder',
    };
    
    const folderResponse = await drive.files.list({
      q: "name='JS Accounting Photos' and mimeType='application/vnd.google-apps.folder' and trashed=false",
      spaces: 'drive',
    });
    
    let folderId;
    if (folderResponse.data.files.length > 0) {
      folderId = folderResponse.data.files[0].id;
    } else {
      const folder = await drive.files.create({
        requestBody: folderMetadata,
        fields: 'id',
      });
      folderId = folder.data.id;
    }
    
    // Get unsynced photos
    const photos = await query(
      `SELECT * FROM photos 
       WHERE user_id = $1 
       AND (google_drive_id IS NULL OR google_drive_id = '')`,
      [userId]
    );
    
    const uploadedPhotos = [];
    
    for (const photo of photos.rows) {
      try {
        const filePath = path.join(__dirname, '../..', photo.file_path);
        
        if (!fs.existsSync(filePath)) {
          logger.warn(`Photo file not found: ${filePath}`);
          continue;
        }
        
        const fileMetadata = {
          name: photo.original_name || photo.file_name,
          parents: [folderId],
        };
        
        const media = {
          mimeType: photo.mime_type,
          body: fs.createReadStream(filePath),
        };
        
        const file = await drive.files.create({
          requestBody: fileMetadata,
          media: media,
          fields: 'id',
        });
        
        // Update photo with Google Drive ID
        await query(
          'UPDATE photos SET google_drive_id = $1 WHERE id = $2',
          [file.data.id, photo.id]
        );
        
        uploadedPhotos.push({
          photoId: photo.id,
          driveId: file.data.id,
        });
      } catch (photoError) {
        logger.error(`Failed to upload photo ${photo.id}:`, photoError);
      }
    }
    
    logger.info(`Uploaded ${uploadedPhotos.length} photos to Google Drive`);
    return uploadedPhotos;
  } catch (error) {
    logger.error('Upload photos error:', error);
    throw error;
  }
}

/**
 * Disconnect Google Drive
 */
async function disconnectDrive(userId) {
  try {
    await query('DELETE FROM drive_tokens WHERE user_id = $1', [userId]);
    logger.info(`Google Drive disconnected for user: ${userId}`);
  } catch (error) {
    logger.error('Disconnect drive error:', error);
    throw error;
  }
}

/**
 * Check if user has connected Google Drive
 */
async function isDriveConnected(userId) {
  try {
    const tokens = await getTokens(userId);
    return tokens !== null;
  } catch (error) {
    return false;
  }
}

module.exports = {
  getAuthUrl,
  exchangeCodeForTokens,
  saveTokens,
  getTokens,
  getDriveClient,
  backupFileToDrive,
  backupDatabaseToDrive,
  uploadPhotosToDrive,
  disconnectDrive,
  isDriveConnected,
};
