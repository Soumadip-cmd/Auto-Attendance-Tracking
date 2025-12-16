const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/register', authLimiter, validate(schemas.register), authController.register);
router.post('/login', authLimiter, validate(schemas.login), authController.login);
router.post('/refresh', validate(schemas.refreshToken), authController.refresh);
router.post('/logout', protect, authController.logout);
router.get('/me', protect, authController.getMe);
router.put('/privacy', protect, validate(schemas.privacySettings), authController.updatePrivacy);
router.put('/password', protect, validate(schemas.updatePassword), authController.updatePassword);

module.exports = router;  // ← Make sure this line exists!