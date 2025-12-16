const AWS = require('aws-sdk');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../config/logger');

class FileUploadService {
  constructor() {
    this.storage = process.env.FILE_STORAGE || 'local'; // 'local', 's3', 'cloudinary'
    this.initializeStorage();
  }

  /**
   * Initialize storage provider
   */
  initializeStorage() {
    if (this.storage === 's3') {
      this.s3 = new AWS.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1'
      });
      logger.info('AWS S3 initialized for file storage');
    } else if (this.storage === 'cloudinary') {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
      });
      logger.info('Cloudinary initialized for file storage');
    } else {
      logger.info('Using local file storage');
    }
  }

  /**
   * Get multer configuration
   */
  getMulterConfig() {
    const storage = multer.diskStorage({
      destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads');
        try {
          await fs.mkdir(uploadDir, { recursive: true });
          cb(null, uploadDir);
        } catch (error) {
          cb(error);
        }
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
      }
    });

    const fileFilter = (req, file, cb) => {
      // Allow images only
      const allowedTypes = /jpeg|jpg|png|gif|webp/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);

      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb(new Error('Only image files are allowed! '));
      }
    };

    return multer({
      storage,
      limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
      },
      fileFilter
    });
  }

  /**
   * Upload file to configured storage
   */
  async uploadFile(file, folder = 'general') {
    try {
      if (this.storage === 's3') {
        return await this.uploadToS3(file, folder);
      } else if (this.storage === 'cloudinary') {
        return await this.uploadToCloudinary(file, folder);
      } else {
        return await this.uploadLocally(file, folder);
      }
    } catch (error) {
      logger.error('File upload error:', error);
      throw error;
    }
  }

  /**
   * Upload file to AWS S3
   */
  async uploadToS3(file, folder) {
    const fileName = `${folder}/${Date.now()}-${file.originalname}`;
    
    const params = {
      Bucket:  process.env.AWS_S3_BUCKET,
      Key: fileName,
      Body: await fs.readFile(file.path),
      ContentType: file. mimetype,
      ACL: 'public-read'
    };

    const result = await this.s3.upload(params).promise();

    // Delete local file
    await fs.unlink(file.path);

    return {
      url: result.Location,
      key: result.Key,
      storage: 's3'
    };
  }

  /**
   * Upload file to Cloudinary
   */
  async uploadToCloudinary(file, folder) {
    const result = await cloudinary.uploader. upload(file.path, {
      folder:  `attendance-tracker/${folder}`,
      resource_type: 'auto'
    });

    // Delete local file
    await fs.unlink(file.path);

    return {
      url: result.secure_url,
      publicId: result.public_id,
      storage: 'cloudinary'
    };
  }

  /**
   * Upload file locally
   */
  async uploadLocally(file, folder) {
    const uploadDir = path.join(__dirname, `../../uploads/${folder}`);
    await fs.mkdir(uploadDir, { recursive: true });

    const fileName = `${Date.now()}-${file.originalname}`;
    const filePath = path.join(uploadDir, fileName);

    // Move file to permanent location
    await fs.rename(file.path, filePath);

    return {
      url: `/uploads/${folder}/${fileName}`,
      path: filePath,
      storage:  'local'
    };
  }

  /**
   * Delete file from storage
   */
  async deleteFile(fileData) {
    try {
      if (fileData.storage === 's3' && fileData.key) {
        await this.deleteFromS3(fileData.key);
      } else if (fileData.storage === 'cloudinary' && fileData.publicId) {
        await this.deleteFromCloudinary(fileData.publicId);
      } else if (fileData.storage === 'local' && fileData.path) {
        await this.deleteLocally(fileData.path);
      }
      return true;
    } catch (error) {
      logger.error('File deletion error:', error);
      return false;
    }
  }

  /**
   * Delete file from S3
   */
  async deleteFromS3(key) {
    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key
    };

    await this.s3.deleteObject(params).promise();
  }

  /**
   * Delete file from Cloudinary
   */
  async deleteFromCloudinary(publicId) {
    await cloudinary.uploader.destroy(publicId);
  }

  /**
   * Delete file locally
   */
  async deleteLocally(filePath) {
    await fs.unlink(filePath);
  }

  /**
   * Upload profile picture
   */
  async uploadProfilePicture(userId, file) {
    const result = await this.uploadFile(file, 'profiles');
    
    logger.info(`Profile picture uploaded for user ${userId}`);

    return result;
  }

  /**
   * Upload document
   */
  async uploadDocument(userId, file, documentType) {
    const result = await this.uploadFile(file, `documents/${documentType}`);
    
    logger.info(`Document uploaded for user ${userId}:  ${documentType}`);

    return result;
  }

  /**
   * Generate signed URL for private files (S3 only)
   */
  async generateSignedUrl(key, expiresIn = 3600) {
    if (this.storage !== 's3') {
      throw new Error('Signed URLs are only available for S3 storage');
    }

    const params = {
      Bucket: process.env. AWS_S3_BUCKET,
      Key: key,
      Expires: expiresIn
    };

    return this.s3.getSignedUrl('getObject', params);
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(fileData) {
    try {
      if (fileData. storage === 's3') {
        const params = {
          Bucket: process.env. AWS_S3_BUCKET,
          Key: fileData.key
        };
        return await this.s3.headObject(params).promise();
      } else if (fileData.storage === 'cloudinary') {
        return await cloudinary.api.resource(fileData.publicId);
      } else if (fileData.storage === 'local') {
        const stats = await fs.stat(fileData.path);
        return {
          size: stats.size,
          modified: stats.mtime,
          created: stats.birthtime
        };
      }
    } catch (error) {
      logger.error('Error getting file metadata:', error);
      return null;
    }
  }

  /**
   * Validate file type
   */
  isValidFileType(file, allowedTypes = ['image/jpeg', 'image/png', 'image/gif']) {
    return allowedTypes.includes(file. mimetype);
  }

  /**
   * Validate file size
   */
  isValidFileSize(file, maxSize = 5 * 1024 * 1024) {
    return file.size <= maxSize;
  }
}

module.exports = new FileUploadService();