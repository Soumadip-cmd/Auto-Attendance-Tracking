const { reportQueue } = require('../queues');
const exportService = require('../../services/exportService');
const analyticsService = require('../../services/analyticsService');
const { User } = require('../../models');
const logger = require('../../config/logger');
const { emailQueue } = require('../queues');

// Process report generation jobs
reportQueue.process(async (job) => {
  const { type, filters, recipients } = job.data;

  logger.info(`Processing report job: ${type}`, { jobId: job.id });

  try {
    let report;

    switch (type) {
      case 'dailyAttendance':
        report = await exportService.exportAttendanceToPDF(filters);
        break;

      case 'weeklyAttendance':
        report = await exportService.exportAttendanceToExcel(filters);
        break;

      case 'monthlyAttendance':
        report = await exportService.exportAttendanceToExcel(filters);
        break;

      case 'userPerformance':
        const performance = await analyticsService.getUserPerformanceReport(
          filters.userId,
          filters.startDate,
          filters.endDate
        );
        report = { data: JSON.stringify(performance, null, 2), filename: 'performance_report.json', mimeType: 'application/json' };
        break;

      case 'departmentComparison':
        const comparison = await analyticsService.getDepartmentComparison(
          filters.startDate,
          filters.endDate
        );
        report = { data: JSON.stringify(comparison, null, 2), filename: 'department_comparison.json', mimeType: 'application/json' };
        break;

      default:
        throw new Error(`Unknown report type: ${type}`);
    }

    // Send report via email if recipients provided
    if (recipients && recipients.length > 0) {
      for (const recipientId of recipients) {
        const user = await User.findById(recipientId);
        if (user) {
          await emailQueue. add('report', {
            type: 'report',
            data: {
              user,
              reportType: type,
              reportData: report
            }
          });
        }
      }
    }

    return { 
      success: true, 
      message: `${type} report generated successfully`,
      filename: report.filename 
    };
  } catch (error) {
    logger.error(`Report job failed:`, error);
    throw error;
  }
});

logger.info('Report worker started');

module.exports = reportQueue;