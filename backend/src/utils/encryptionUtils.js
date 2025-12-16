const crypto = require('crypto');

class EncryptionUtils {
  constructor() {
    this.algorithm = 'aes-256-cbc';
    this.secretKey = process.env.ENCRYPTION_SECRET || 'default-secret-key-change-me-in-production';
    this. key = crypto.createHash('sha256').update(this.secretKey).digest();
  }

  /**
   * Encrypt text
   */
  encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt text
   */
  decrypt(encryptedText) {
    const parts = encryptedText.split(': ');
    const iv = Buffer. from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Create hash (one-way)
   */
  hash(text) {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  /**
   * Create HMAC signature
   */
  createHMAC(text, secret = this.secretKey) {
    return crypto.createHmac('sha256', secret).update(text).digest('hex');
  }

  /**
   * Verify HMAC signature
   */
  verifyHMAC(text, signature, secret = this.secretKey) {
    const expectedSignature = this.createHMAC(text, secret);
    return signature === expectedSignature;
  }

  /**
   * Generate random token
   */
  generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate random OTP
   */
  generateOTP(length = 6) {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * 10)];
    }
    return otp;
  }

  /**
   * Generate UUID
   */
  generateUUID() {
    return crypto.randomUUID();
  }

  /**
   * Encrypt object
   */
  encryptObject(obj) {
    return this.encrypt(JSON.stringify(obj));
  }

  /**
   * Decrypt object
   */
  decryptObject(encryptedText) {
    return JSON.parse(this.decrypt(encryptedText));
  }

  /**
   * Hash password (use bcrypt in production)
   */
  hashPassword(password) {
    return this.hash(password + this.secretKey);
  }

  /**
   * Compare password hash
   */
  comparePassword(password, hash) {
    return this.hashPassword(password) === hash;
  }

  /**
   * Create signed data
   */
  signData(data) {
    const dataString = JSON.stringify(data);
    const signature = this.createHMAC(dataString);
    return {
      data,
      signature
    };
  }

  /**
   * Verify signed data
   */
  verifySignedData(signedData) {
    const dataString = JSON.stringify(signedData.data);
    return this.verifyHMAC(dataString, signedData.signature);
  }

  /**
   * Mask sensitive data
   */
  maskEmail(email) {
    const [username, domain] = email.split('@');
    const maskedUsername = username.substring(0, 2) + '***' + username. substring(username.length - 1);
    return `${maskedUsername}@${domain}`;
  }

  /**
   * Mask phone number
   */
  maskPhoneNumber(phone) {
    return phone.substring(0, 3) + '***' + phone.substring(phone.length - 2);
  }

  /**
   * Mask credit card
   */
  maskCreditCard(cardNumber) {
    return '**** **** **** ' + cardNumber.substring(cardNumber.length - 4);
  }

  /**
   * Generate API key
   */
  generateAPIKey() {
    return 'sk_' + this.generateToken(32);
  }
}

module. exports = new EncryptionUtils();