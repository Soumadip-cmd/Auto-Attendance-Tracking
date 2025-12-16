const PDFDocument = require('pdfkit');
const { Parser } = require('json2csv');
const ExcelJS = require('exceljs');
const moment = require('moment');
const logger = require('../config/logger');
const { Attendance, User, Location } = require('../models');

class ExportService {
  /**
   * Export attendance records to CSV
   */
  async exportAttendanceToCSV(filters = {}) {
    const { userId, department, startDate, endDate } = filters;

    const query = {};
    
    if (userId) {
      query.user = userId;
    }

    if (department) {
      const users = await User.find({ department }).select('_id');
      query.user = { $in: users.map(u => u._id) };
    }

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const records = await Attendance.find(query)
      .populate('user', 'firstName lastName email employeeId department')
      .populate('checkIn. geofence', 'name')
      .populate('checkOut.geofence', 'name')
      .sort({ date: -1 })
      .lean();

    // Transform data for CSV
    const csvData = records.map(record => ({
      Date: moment(record.date).format('YYYY-MM-DD'),
      EmployeeID: record.user. employeeId || 'N/A',
      Name: `${record.user.firstName} ${record.user.lastName}`,
      Email: record.user.email,
      Department: record.user.department || 'N/A',
      CheckInTime: record.checkIn.time ?  moment(record.checkIn.time).format('HH:mm:ss') : 'N/A',
      CheckInLocation: record.checkIn.geofence?. name || 'N/A',
      CheckOutTime: record. checkOut.time ? moment(record.checkOut.time).format('HH:mm:ss') : 'N/A',
      CheckOutLocation: record.checkOut.geofence?.name || 'N/A',
      Duration: record.duration ?  `${Math.floor(record.duration / 60)}h ${record.duration % 60}m` : 'N/A',
      ActualHours: record.actualHours || 0,
      Status: record.status,
      IsLate: record. isLate ?  'Yes' : 'No',
      LateBy: record.lateBy ?  `${record.lateBy} min` : 'N/A',
      IsEarlyDeparture: record.isEarlyDeparture ? 'Yes' : 'No',
      EarlyBy: record.earlyBy ? `${record.earlyBy} min` : 'N/A'
    }));

    const fields = [
      'Date',
      'EmployeeID',
      'Name',
      'Email',
      'Department',
      'CheckInTime',
      'CheckInLocation',
      'CheckOutTime',
      'CheckOutLocation',
      'Duration',
      'ActualHours',
      'Status',
      'IsLate',
      'LateBy',
      'IsEarlyDeparture',
      'EarlyBy'
    ];

    const parser = new Parser({ fields });
    const csv = parser.parse(csvData);

    return {
      data: csv,
      filename: `attendance_report_${moment().format('YYYY-MM-DD')}.csv`,
      mimeType: 'text/csv'
    };
  }

  /**
   * Export attendance records to Excel
   */
  async exportAttendanceToExcel(filters = {}) {
    const { userId, department, startDate, endDate } = filters;

    const query = {};
    
    if (userId) {
      query.user = userId;
    }

    if (department) {
      const users = await User. find({ department }).select('_id');
      query.user = { $in: users.map(u => u._id) };
    }

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const records = await Attendance.find(query)
      .populate('user', 'firstName lastName email employeeId department')
      .populate('checkIn.geofence', 'name')
      .populate('checkOut.geofence', 'name')
      .sort({ date: -1 })
      .lean();

    // Create workbook
    const workbook = new ExcelJS. Workbook();
    const worksheet = workbook.addWorksheet('Attendance Report');

    // Add headers
    worksheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Employee ID', key: 'employeeId', width: 15 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Department', key: 'department', width:  20 },
      { header: 'Check In', key:  'checkIn', width: 15 },
      { header: 'Check In Location', key: 'checkInLocation', width: 20 },
      { header: 'Check Out', key: 'checkOut', width: 15 },
      { header: 'Check Out Location', key: 'checkOutLocation', width: 20 },
      { header: 'Duration (hrs)', key: 'duration', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Late', key: 'isLate', width: 10 },
      { header: 'Late By (min)', key: 'lateBy', width: 15 }
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3B82F6' }
    };
    worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

    // Add data
    records.forEach(record => {
      worksheet.addRow({
        date: moment(record.date).format('YYYY-MM-DD'),
        employeeId: record.user. employeeId || 'N/A',
        name: `${record.user.firstName} ${record.user.lastName}`,
        email: record.user.email,
        department: record.user. department || 'N/A',
        checkIn: record.checkIn.time ?  moment(record.checkIn.time).format('HH:mm:ss') : 'N/A',
        checkInLocation: record.checkIn.geofence?. name || 'N/A',
        checkOut: record.checkOut.time ? moment(record. checkOut.time).format('HH:mm:ss') : 'N/A',
        checkOutLocation: record.checkOut. geofence?.name || 'N/A',
        duration:  record.actualHours || 0,
        status: record.status,
        isLate: record.isLate ? 'Yes' : 'No',
        lateBy: record.lateBy || 0
      });
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    return {
      data: buffer,
      filename: `attendance_report_${moment().format('YYYY-MM-DD')}.xlsx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
  }

  /**
   * Export attendance report to PDF
   */
  async exportAttendanceToPDF(filters = {}) {
    const { userId, department, startDate, endDate } = filters;

    const query = {};
    
    if (userId) {
      query.user = userId;
    }

    if (department) {
      const users = await User.find({ department }).select('_id');
      query.user = { $in: users. map(u => u._id) };
    }

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const records = await Attendance.find(query)
      .populate('user', 'firstName lastName email employeeId department')
      .sort({ date: -1 })
      .limit(100) // Limit for PDF
      .lean();

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve({
            data: buffer,
            filename: `attendance_report_${moment().format('YYYY-MM-DD')}.pdf`,
            mimeType: 'application/pdf'
          });
        });

        // Add header
        doc.fontSize(20).text('Attendance Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Generated: ${moment().format('YYYY-MM-DD HH: mm')}`, { align: 'center' });
        
        if (department) {
          doc.text(`Department: ${department}`, { align: 'center' });
        }
        
        if (startDate && endDate) {
          doc.text(`Period: ${moment(startDate).format('YYYY-MM-DD')} to ${moment(endDate).format('YYYY-MM-DD')}`, { align: 'center' });
        }

        doc.moveDown();
        doc.moveDown();

        // Add summary
        const present = records.filter(r => r.status === 'present').length;
        const late = records. filter(r => r.isLate).length;
        const absent = records.filter(r => r.status === 'absent').length;

        doc.fontSize(14).text('Summary:', { underline: true });
        doc.fontSize(11);
        doc.text(`Total Records: ${records.length}`);
        doc.text(`Present: ${present}`);
        doc.text(`Late: ${late}`);
        doc.text(`Absent: ${absent}`);
        doc.moveDown();
        doc.moveDown();

        // Add table header
        doc.fontSize(10);
        const tableTop = doc.y;
        const tableHeaders = ['Date', 'Name', 'Check In', 'Check Out', 'Hours', 'Status'];
        const colWidths = [80, 120, 70, 70, 50, 80];
        let xPos = 50;

        doc.font('Helvetica-Bold');
        tableHeaders.forEach((header, i) => {
          doc.text(header, xPos, tableTop, { width: colWidths[i], align: 'left' });
          xPos += colWidths[i];
        });

        doc.moveDown();
        doc.font('Helvetica');

        // Add table rows
        records.forEach((record, index) => {
          if (doc.y > 700) {
            doc.addPage();
            doc.y = 50;
          }

          const rowY = doc.y;
          xPos = 50;

          const rowData = [
            moment(record.date).format('MM/DD/YY'),
            `${record.user.firstName} ${record.user.lastName}`,
            record.checkIn.time ?  moment(record.checkIn.time).format('HH:mm') : 'N/A',
            record.checkOut.time ?  moment(record.checkOut.time).format('HH:mm') : 'N/A',
            record.actualHours ?  record.actualHours. toFixed(1) : '0',
            record.status
          ];

          rowData.forEach((data, i) => {
            doc.text(data, xPos, rowY, { width:  colWidths[i], align:  'left' });
            xPos += colWidths[i];
          });

          doc.moveDown(0.5);
        });

        // Add footer
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
          doc.switchToPage(i);
          doc.fontSize(8);
          doc.text(
            `Page ${i + 1} of ${pages.count}`,
            50,
            doc.page.height - 50,
            { align: 'center' }
          );
        }

        doc.end();
      } catch (error) {
        logger.error('Error generating PDF:', error);
        reject(error);
      }
    });
  }

  /**
   * Export location history to CSV
   */
  async exportLocationHistoryToCSV(userId, filters = {}) {
    const { startDate, endDate } = filters;

    const query = { user: userId };

    if (startDate && endDate) {
      query.timestamp = {
        $gte:  new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const locations = await Location.find(query)
      .populate('device', 'deviceName deviceType')
      .populate('geofences. geofence', 'name')
      .sort({ timestamp: -1 })
      .lean();

    const csvData = locations.map(loc => ({
      Timestamp: moment(loc.timestamp).format('YYYY-MM-DD HH: mm:ss'),
      Latitude: loc.location.coordinates[1],
      Longitude:  loc.location.coordinates[0],
      Accuracy: loc.accuracy,
      TrackingType: loc.trackingType,
      Activity: loc.activity || 'N/A',
      BatteryLevel: loc.batteryLevel || 'N/A',
      Device: loc.device?. deviceName || loc.device?.deviceType || 'N/A',
      Geofences: loc.geofences.map(g => g.geofence?. name).filter(Boolean).join(', ') || 'None'
    }));

    const fields = [
      'Timestamp',
      'Latitude',
      'Longitude',
      'Accuracy',
      'TrackingType',
      'Activity',
      'BatteryLevel',
      'Device',
      'Geofences'
    ];

    const parser = new Parser({ fields });
    const csv = parser.parse(csvData);

    return {
      data: csv,
      filename: `location_history_${moment().format('YYYY-MM-DD')}.csv`,
      mimeType: 'text/csv'
    };
  }

  /**
   * Export user data for GDPR compliance
   */
  async exportUserDataForGDPR(userId) {
    const user = await User.findById(userId).lean();
    if (!user) {
      throw new Error('User not found');
    }

    // Get all user data
    const [attendanceRecords, locationRecords, events] = await Promise.all([
      Attendance.find({ user: userId }).lean(),
      Location.find({ user: userId }).lean(),
      Event.find({ actor: userId }).lean()
    ]);

    const userData = {
      profile: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        employeeId: user.employeeId,
        department: user.department,
        phoneNumber: user.phoneNumber,
        role: user.role,
        consentGiven: user.consentGiven,
        consentDate: user.consentDate,
        trackingEnabled: user.trackingEnabled,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      attendance: {
        totalRecords: attendanceRecords.length,
        records: attendanceRecords.map(r => ({
          date: r.date,
          checkIn: r.checkIn.time,
          checkOut: r.checkOut.time,
          duration: r.duration,
          status: r.status
        }))
      },
      locations: {
        totalRecords:  locationRecords.length,
        records: locationRecords.map(l => ({
          timestamp: l.timestamp,
          latitude: l.location.coordinates[1],
          longitude: l.location.coordinates[0],
          accuracy: l.accuracy,
          trackingType: l.trackingType
        }))
      },
      events: {
        totalRecords: events.length,
        records: events.map(e => ({
          eventType: e.eventType,
          timestamp: e.createdAt,
          details: e.details
        }))
      },
      exportedAt: new Date(),
      exportedBy: 'System (GDPR Request)'
    };

    const json = JSON.stringify(userData, null, 2);

    return {
      data: json,
      filename: `user_data_${user. email}_${moment().format('YYYY-MM-DD')}.json`,
      mimeType: 'application/json'
    };
  }
}

module.exports = new ExportService();