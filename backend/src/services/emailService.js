const nodemailer = require('nodemailer');
const logger = require('../config/logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  /**
   * Initialize email transporter
   */
  initializeTransporter() {
    // For development, use ethereal. email (fake SMTP)
    // For production, use your actual SMTP settings
    if (process.env.NODE_ENV === 'production') {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process. env.SMTP_PORT,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process. env.SMTP_USER,
          pass: process.env. SMTP_PASSWORD
        }
      });
    } else {
      // Development mode - log emails to console
      this.transporter = nodemailer. createTransport({
        host:  'smtp.ethereal.email',
        port: 587,
        auth: {
          user: process. env.ETHEREAL_USER || 'ethereal. user@ethereal.email',
          pass: process.env.ETHEREAL_PASS || 'ethereal_password'
        }
      });
    }
  }

  /**
   * Send email
   */
  async sendEmail({ to, subject, html, text }) {
    try {
      const mailOptions = {
        from:  process.env.EMAIL_FROM || 'Attendance Tracker <noreply@attendancetracker.com>',
        to,
        subject,
        html,
        text
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      logger.info(`Email sent:  ${info.messageId}`);
      
      // In development, log the preview URL
      if (process.env. NODE_ENV !== 'production') {
        logger.info(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
      }

      return info;
    } catch (error) {
      logger.error('Error sending email:', error);
      throw error;
    }
  }

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(user) {
    const subject = 'Welcome to Attendance Tracker';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width:  600px; margin: 0 auto;">
        <h2 style="color: #3B82F6;">Welcome to Attendance Tracker! </h2>
        <p>Hi ${user.firstName},</p>
        <p>Your account has been successfully created. </p>
        <div style="background-color: #F3F4F6; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Email:</strong> ${user.email}</p>
          <p style="margin: 5px 0;"><strong>Role:</strong> ${user.role}</p>
          ${user.employeeId ? `<p style="margin: 5px 0;"><strong>Employee ID:</strong> ${user.employeeId}</p>` : ''}
        </div>
        <p>Please log in to the mobile app or web portal to get started.</p>
        <p>If you have any questions, feel free to contact our support team.</p>
        <p>Best regards,<br>Attendance Tracker Team</p>
      </div>
    `;

    const text = `
      Welcome to Attendance Tracker!
      
      Hi ${user.firstName},
      
      Your account has been successfully created. 
      Email: ${user.email}
      Role: ${user.role}
      ${user.employeeId ? `Employee ID: ${user.employeeId}` : ''}
      
      Please log in to the mobile app or web portal to get started. 
      
      Best regards,
      Attendance Tracker Team
    `;

    return this.sendEmail({ to: user.email, subject, html, text });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(user, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password? token=${resetToken}`;
    
    const subject = 'Password Reset Request';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3B82F6;">Password Reset Request</h2>
        <p>Hi ${user. firstName},</p>
        <p>We received a request to reset your password. Click the button below to reset it: </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #3B82F6; color: white; padding:  12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="color: #6B7280; word-break: break-all;">${resetUrl}</p>
        <p><strong>This link will expire in 1 hour.</strong></p>
        <p>If you didn't request a password reset, please ignore this email.</p>
        <p>Best regards,<br>Attendance Tracker Team</p>
      </div>
    `;

    const text = `
      Password Reset Request
      
      Hi ${user.firstName},
      
      We received a request to reset your password. Click the link below to reset it:
      ${resetUrl}
      
      This link will expire in 1 hour.
      
      If you didn't request a password reset, please ignore this email.
      
      Best regards,
      Attendance Tracker Team
    `;

    return this.sendEmail({ to: user.email, subject, html, text });
  }

  /**
   * Send password changed confirmation email
   */
  async sendPasswordChangedEmail(user) {
    const subject = 'Password Changed Successfully';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3B82F6;">Password Changed</h2>
        <p>Hi ${user.firstName},</p>
        <p>Your password has been changed successfully.</p>
        <p>If you didn't make this change, please contact support immediately.</p>
        <p>Best regards,<br>Attendance Tracker Team</p>
      </div>
    `;

    const text = `
      Password Changed
      
      Hi ${user.firstName},
      
      Your password has been changed successfully.
      
      If you didn't make this change, please contact support immediately.
      
      Best regards,
      Attendance Tracker Team
    `;

    return this.sendEmail({ to: user.email, subject, html, text });
  }

  /**
   * Send attendance alert email
   */
  async sendAttendanceAlert(user, alertData) {
    const subject = `Attendance Alert: ${alertData.type}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #EF4444;">Attendance Alert</h2>
        <p>Hi ${user.firstName},</p>
        <p>${alertData.message}</p>
        <div style="background-color: #FEF2F2; padding: 15px; border-left: 4px solid #EF4444; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Date:</strong> ${alertData.date}</p>
          <p style="margin:  5px 0;"><strong>Time:</strong> ${alertData.time}</p>
          ${alertData.location ? `<p style="margin: 5px 0;"><strong>Location:</strong> ${alertData.location}</p>` : ''}
        </div>
        <p>Please ensure you follow attendance policies.</p>
        <p>Best regards,<br>Attendance Tracker Team</p>
      </div>
    `;

    const text = `
      Attendance Alert
      
      Hi ${user.firstName},
      
      ${alertData.message}
      
      Date: ${alertData.date}
      Time: ${alertData.time}
      ${alertData.location ? `Location: ${alertData.location}` : ''}
      
      Please ensure you follow attendance policies.
      
      Best regards,
      Attendance Tracker Team
    `;

    return this.sendEmail({ to: user.email, subject, html, text });
  }

  /**
   * Send geofence violation alert to managers
   */
  async sendGeofenceViolationAlert(managers, user, violationData) {
    const recipients = managers.map(m => m.email).join(', ');
    
    const subject = `Geofence Violation Alert: ${user.fullName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #EF4444;">Geofence Violation Alert</h2>
        <p>A geofence violation has been detected. </p>
        <div style="background-color: #FEF2F2; padding:  15px; border-left:  4px solid #EF4444; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>User:</strong> ${user.fullName} (${user.email})</p>
          <p style="margin: 5px 0;"><strong>Employee ID:</strong> ${user.employeeId || 'N/A'}</p>
          <p style="margin: 5px 0;"><strong>Geofence:</strong> ${violationData.geofenceName}</p>
          <p style="margin: 5px 0;"><strong>Time:</strong> ${violationData. time}</p>
          <p style="margin: 5px 0;"><strong>Type:</strong> ${violationData. type}</p>
        </div>
        <p>Please review this violation and take appropriate action.</p>
        <p>Best regards,<br>Attendance Tracker System</p>
      </div>
    `;

    const text = `
      Geofence Violation Alert
      
      A geofence violation has been detected. 
      
      User: ${user.fullName} (${user. email})
      Employee ID: ${user.employeeId || 'N/A'}
      Geofence: ${violationData. geofenceName}
      Time: ${violationData.time}
      Type: ${violationData.type}
      
      Please review this violation and take appropriate action. 
      
      Best regards,
      Attendance Tracker System
    `;

    return this.sendEmail({ to: recipients, subject, html, text });
  }

  /**
   * Send daily attendance report
   */
  async sendDailyReport(manager, reportData) {
    const subject = `Daily Attendance Report - ${reportData.date}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3B82F6;">Daily Attendance Report</h2>
        <p>Hi ${manager.firstName},</p>
        <p>Here's your attendance summary for ${reportData.date}: </p>
        <div style="background-color: #F3F4F6; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 10px 0;"><strong>Present:</strong> ${reportData.present}</p>
          <p style="margin: 10px 0;"><strong>Absent:</strong> ${reportData.absent}</p>
          <p style="margin: 10px 0;"><strong>Late:</strong> ${reportData.late}</p>
          <p style="margin: 10px 0;"><strong>On Leave:</strong> ${reportData.onLeave}</p>
        </div>
        <p>View detailed report in the dashboard.</p>
        <p>Best regards,<br>Attendance Tracker System</p>
      </div>
    `;

    const text = `
      Daily Attendance Report - ${reportData.date}
      
      Hi ${manager.firstName},
      
      Here's your attendance summary for ${reportData.date}:
      
      Present: ${reportData.present}
      Absent: ${reportData.absent}
      Late: ${reportData. late}
      On Leave: ${reportData.onLeave}
      
      View detailed report in the dashboard.
      
      Best regards,
      Attendance Tracker System
    `;

    return this.sendEmail({ to: manager. email, subject, html, text });
  }
}

module.exports = new EmailService();