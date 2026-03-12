/**
 * Photo Upload Routes
 * Handles receipt and handwriting note uploads
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate, allRoles } = require('../middleware/auth');
const logger = require('../utils/logger');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads/photos');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userDir = path.join(uploadsDir, req.user.id);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and PDF are allowed.'), false);
  }
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 5, // Max 5 files per upload
  },
});

/**
 * @POST /api/photos/upload
 * Upload photos (receipts, handwriting notes, site photos)
 */
router.post('/upload', authenticate, allRoles, upload.array('photos', 5), async (req, res) => {
  try {
    const { type = 'receipt', description, projectId, transactionId } = req.body;
    const userId = req.user.id;
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded.',
      });
    }
    
    const uploadedPhotos = [];
    
    for (const file of req.files) {
      const photoId = uuidv4();
      const relativePath = `/uploads/photos/${userId}/${file.filename}`;
      
      // Save to database
      const result = await query(
        `INSERT INTO photos (id, user_id, project_id, transaction_id, type, 
                            original_name, file_name, file_path, file_size, 
                            mime_type, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          photoId,
          userId,
          projectId || null,
          transactionId || null,
          type,
          file.originalname,
          file.filename,
          relativePath,
          file.size,
          file.mimetype,
          description || null,
        ]
      );
      
      uploadedPhotos.push(result.rows[0]);
    }
    
    logger.info(`Photos uploaded by ${req.user.email}: ${uploadedPhotos.length} files`);
    
    res.status(201).json({
      success: true,
      message: `${uploadedPhotos.length} photo(s) uploaded successfully.`,
      data: uploadedPhotos,
    });
  } catch (error) {
    logger.error('Photo upload error:', error);
    
    // Clean up uploaded files on error
    if (req.files) {
      req.files.forEach(file => {
        fs.unlink(file.path, (err) => {
          if (err) logger.error('Failed to delete file:', err);
        });
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to upload photos.',
    });
  }
});

/**
 * @GET /api/photos
 * Get user's photos with filters
 */
router.get('/', authenticate, allRoles, async (req, res) => {
  try {
    const { type, projectId, transactionId, page = 1, limit = 20 } = req.query;
    const userId = req.user.id;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE p.user_id = $1';
    const params = [userId];
    let paramIndex = 2;
    
    if (type) {
      whereClause += ` AND p.type = $${paramIndex++}`;
      params.push(type);
    }
    
    if (projectId) {
      whereClause += ` AND p.project_id = $${paramIndex++}`;
      params.push(projectId);
    }
    
    if (transactionId) {
      whereClause += ` AND p.transaction_id = $${paramIndex++}`;
      params.push(transactionId);
    }
    
    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM photos p ${whereClause}`,
      params
    );
    const totalCount = parseInt(countResult.rows[0].count);
    
    // Get photos with project info
    const photosResult = await query(
      `SELECT p.*, 
              pr.name as project_name,
              t.description as transaction_description
       FROM photos p
       LEFT JOIN projects pr ON p.project_id = pr.id
       LEFT JOIN transactions t ON p.transaction_id = t.id
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    );
    
    res.json({
      success: true,
      data: {
        photos: photosResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Get photos error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get photos.',
    });
  }
});

/**
 * @GET /api/photos/:id
 * Get single photo
 */
router.get('/:id', authenticate, allRoles, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const result = await query(
      `SELECT p.*, 
              pr.name as project_name,
              t.description as transaction_description
       FROM photos p
       LEFT JOIN projects pr ON p.project_id = pr.id
       LEFT JOIN transactions t ON p.transaction_id = t.id
       WHERE p.id = $1 AND (p.user_id = $2 OR $3 = 'director' OR $3 = 'manager')`,
      [id, userId, req.user.role]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Photo not found.',
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    logger.error('Get photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get photo.',
    });
  }
});

/**
 * @PUT /api/photos/:id
 * Update photo metadata
 */
router.put('/:id', authenticate, allRoles, async (req, res) => {
  try {
    const { id } = req.params;
    const { description, transactionId } = req.body;
    const userId = req.user.id;
    
    // Check ownership
    const photoCheck = await query(
      'SELECT user_id FROM photos WHERE id = $1',
      [id]
    );
    
    if (photoCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Photo not found.',
      });
    }
    
    // Only owner or director/manager can update
    if (photoCheck.rows[0].user_id !== userId && 
        !['director', 'manager'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied.',
      });
    }
    
    const result = await query(
      `UPDATE photos 
       SET description = COALESCE($1, description),
           transaction_id = COALESCE($2, transaction_id),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [description, transactionId, id]
    );
    
    res.json({
      success: true,
      message: 'Photo updated successfully.',
      data: result.rows[0],
    });
  } catch (error) {
    logger.error('Update photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update photo.',
    });
  }
});

/**
 * @DELETE /api/photos/:id
 * Delete photo
 */
router.delete('/:id', authenticate, allRoles, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Get photo info
    const photoResult = await query(
      'SELECT user_id, file_path FROM photos WHERE id = $1',
      [id]
    );
    
    if (photoResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Photo not found.',
      });
    }
    
    const photo = photoResult.rows[0];
    
    // Check ownership
    if (photo.user_id !== userId && 
        !['director', 'manager'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied.',
      });
    }
    
    // Delete file
    const filePath = path.join(__dirname, '../..', photo.file_path);
    fs.unlink(filePath, (err) => {
      if (err) logger.error('Failed to delete file:', err);
    });
    
    // Delete from database
    await query('DELETE FROM photos WHERE id = $1', [id]);
    
    logger.info(`Photo deleted by ${req.user.email}: ${id}`);
    
    res.json({
      success: true,
      message: 'Photo deleted successfully.',
    });
  } catch (error) {
    logger.error('Delete photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete photo.',
    });
  }
});

/**
 * @POST /api/photos/:id/ocr
 * Save OCR text for photo
 */
router.post('/:id/ocr', authenticate, allRoles, async (req, res) => {
  try {
    const { id } = req.params;
    const { ocrText } = req.body;
    const userId = req.user.id;
    
    // Check ownership
    const photoCheck = await query(
      'SELECT user_id FROM photos WHERE id = $1',
      [id]
    );
    
    if (photoCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Photo not found.',
      });
    }
    
    if (photoCheck.rows[0].user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied.',
      });
    }
    
    await query(
      'UPDATE photos SET ocr_text = $1 WHERE id = $2',
      [ocrText, id]
    );
    
    res.json({
      success: true,
      message: 'OCR text saved successfully.',
    });
  } catch (error) {
    logger.error('Save OCR error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save OCR text.',
    });
  }
});

// Error handler for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum 10MB per file.',
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum 5 files per upload.',
      });
    }
  }
  
  if (error.message === 'Invalid file type. Only JPEG, PNG, WebP, and PDF are allowed.') {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
  
  next(error);
});

module.exports = router;
