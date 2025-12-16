#!/usr/bin/env node

/**
 * Manual Report Generation Script
 * Generate reports on-demand
 * Usage: node src/scripts/generateReport.js <type> [options]
 * Types: daily, weekly, monthly, performance
 */

require('dotenv').config();
const mongoose = require('mongoose');
const exportService = require('../services/exportService');
const analyticsService = require('../services/analyticsService');
const logger = require('../config/logger');
const fs = require('fs').promises;
const path = require('path');
const moment = require('moment');

const reportType = process.argv[2];
const outputDir = process.argv[3] || './reports';

async function generateReport() {
  try {
    await mongoose.connect(process.env. MONGODB_URI);
    logger.info('Connected to MongoDB');

    // Create output directory
    await fs.mkdir(outputDir, { recursive: true });

    let report;
    let filename;

    switch (reportType) {
      case 'daily': 
        const today = moment().format('YYYY-MM-DD');
        report = await exportService.exportAttendanceToPDF({
          startDate: today,
          endDate: today
        });
        filename = `daily_report_${today}.pdf`;
        break;

      case 'weekly':
        const weekStart = moment().startOf('week').format('YYYY-MM-DD');
        const weekEnd = moment().endOf('week').format('YYYY-MM-DD');
        report = await exportService.exportAttendanceToExcel({
          startDate: weekStart,
          endDate: weekEnd
        });
        filename = `weekly_report_${weekStart}_to_${weekEnd}.xlsx`;
        break;

      case 'monthly':
        const monthStart = moment().startOf('month').format('YYYY-MM-DD');
        const monthEnd = moment().endOf('month').format('YYYY-MM-DD');
        report = await exportService.exportAttendanceToExcel({
          startDate: monthStart,
          endDate: monthEnd
        });
        filename = `monthly_report_${moment().format('YYYY-MM')}.xlsx`;
        break;

      case 'department':
        const deptComparison = await analyticsService.getDepartmentComparison(
          moment().subtract(30, 'days').format('YYYY-MM-DD'),
          moment().format('YYYY-MM-DD')
        );
        report = {
          data: JSON.stringify(deptComparison, null, 2),
          mimeType: 'application/json'
        };
        filename = `department_comparison_${moment().format('YYYY-MM-DD')}.json`;
        break;

      default:
        logger.error(`Unknown report type: ${reportType}`);
        logger.info('Available types: daily, weekly, monthly, department');
        process.exit(1);
    }

    // Save report to file
    const outputPath = path.join(outputDir, filename);
    await fs.writeFile(outputPath, report. data);

    logger.info(`✅ Report generated successfully! `);
    logger.info(`📄 File:  ${outputPath}`);
    logger.info(`📊 Type: ${reportType}`);

    process.exit(0);
  } catch (error) {
    logger.error('Report generation error:', error);
    process.exit(1);
  }
}

if (! reportType) {
  logger.error('Please specify report type');
  logger.info('Usage: node src/scripts/generateReport.js <type> [output-dir]');
  logger.info('Types: daily, weekly, monthly, department');
  process.exit(1);
}

generateReport();