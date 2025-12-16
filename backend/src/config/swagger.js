/**
 * Swagger API Documentation Configuration
 * Add JSDoc comments to your route files for automatic documentation
 */

/**
 * @swagger
 * tags:
 *   - name: Authentication
 *     description: User authentication and authorization
 *   - name: Users
 *     description: User management
 *   - name: Locations
 *     description: Location tracking and history
 *   - name:  Attendance
 *     description:  Attendance management and records
 *   - name:  Geofences
 *     description: Geofence management
 *   - name: Analytics
 *     description: Reports and analytics
 *   - name: Export
 *     description: Data export functionality
 */

/**
 * Example route documentation: 
 * 
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody: 
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type:  string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses: 
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type:  object
 *               properties: 
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type:  object
 *                   properties: 
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     token:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *       401:
 *         description: Invalid credentials
 */

module.exports = {
  // Swagger configuration exported from app.js
};