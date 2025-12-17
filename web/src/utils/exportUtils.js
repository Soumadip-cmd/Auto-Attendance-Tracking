import * as XLSX from 'xlsx';

/**
 * Export employees to Excel
 */
export const exportEmployeesToExcel = (data) => {
  if (!data || data.length === 0) {
    console.warn('No employee data to export');
    return;
  }

  const workbook = XLSX.utils.book_new();
  
  const exportData = data.map((employee, index) => ({
    'No.': index + 1,
    'Employee ID': employee.employeeId || 'N/A',
    'First Name': employee.firstName || 'N/A',
    'Last Name': employee.lastName || 'N/A',
    'Email': employee.email || 'N/A',
    'Phone':  employee.phoneNumber || 'N/A',
    'Department':  employee.department || 'N/A',
    'Role': employee.role || 'N/A',
    'Status': employee.isActive ? 'Active' : 'Inactive',
    'Joined Date': employee.createdAt ? new Date(employee.createdAt).toLocaleDateString() : 'N/A',
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  
  // Set column widths
  worksheet['!cols'] = [
    { wch: 5 },  // No.
    { wch: 12 }, // Employee ID
    { wch: 15 }, // First Name
    { wch: 15 }, // Last Name
    { wch:  25 }, // Email
    { wch: 15 }, // Phone
    { wch: 15 }, // Department
    { wch: 10 }, // Role
    { wch: 10 }, // Status
    { wch: 12 }, // Joined Date
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees');
  
  const fileName = `Employees_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

/**
 * Export attendance to Excel
 */
export const exportAttendanceToExcel = (data, date) => {
  if (!data || data.length === 0) {
    console.warn('No attendance data to export');
    return;
  }

  const workbook = XLSX.utils.book_new();
  
  const exportData = data.map((record, index) => ({
    'No.': index + 1,
    'Employee ID': record. employee?.employeeId || 'N/A',
    'Name': `${record.employee?.firstName || ''} ${record.employee?.lastName || ''}`.trim() || 'N/A',
    'Department': record.employee?.department || 'N/A',
    'Check In': record.checkIn ? new Date(record.checkIn).toLocaleString() : 'N/A',
    'Check Out':  record.checkOut ? new Date(record.checkOut).toLocaleString() : 'Not yet',
    'Duration': calculateDuration(record.checkIn, record.checkOut),
    'Status': record.status || 'N/A',
    'Location': record.location?. address || 'N/A',
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  
  // Set column widths
  worksheet['!cols'] = [
    { wch: 5 },  // No.
    { wch: 12 }, // Employee ID
    { wch:  20 }, // Name
    { wch: 15 }, // Department
    { wch: 20 }, // Check In
    { wch: 20 }, // Check Out
    { wch:  12 }, // Duration
    { wch: 10 }, // Status
    { wch: 25 }, // Location
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
  
  const fileName = `Attendance_${date || new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

/**
 * Export reports to Excel
 */
export const exportReportsToExcel = (data, reportType, startDate, endDate) => {
  if (!data || data.length === 0) {
    console.warn('No report data to export');
    return;
  }

  const workbook = XLSX.utils.book_new();
  
  // Summary Sheet
  const summaryData = [
    { 'Report Type': reportType || 'N/A' },
    { 'Start Date': startDate ? new Date(startDate).toLocaleDateString() : 'N/A' },
    { 'End Date':  endDate ? new Date(endDate).toLocaleDateString() : 'N/A' },
    { 'Generated On': new Date().toLocaleString() },
    { 'Total Records': data.length },
  ];

  const summarySheet = XLSX.utils. json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // Detailed Data Sheet
  const exportData = data.map((record, index) => ({
    'No.': index + 1,
    'Employee ID': record.employeeId || record.employee?.employeeId || 'N/A',
    'Name': record.name || `${record.employee?.firstName || ''} ${record.employee?.lastName || ''}`.trim() || 'N/A',
    'Department': record.department || record.employee?.department || 'N/A',
    'Date': record.date ? new Date(record.date).toLocaleDateString() : 'N/A',
    'Check In': record.checkIn ? new Date(record.checkIn).toLocaleTimeString() : 'N/A',
    'Check Out': record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : 'Not yet',
    'Duration': record.duration || calculateDuration(record.checkIn, record.checkOut),
    'Status': record.status || 'N/A',
    'Total Days': record.totalDays || 'N/A',
    'Present Days': record.presentDays || 'N/A',
    'Absent Days': record.absentDays || 'N/A',
    'Late Days': record.lateDays || 'N/A',
    'Attendance %': record.attendancePercentage || 'N/A',
  }));

  const detailSheet = XLSX.utils.json_to_sheet(exportData);
  
  // Set column widths
  detailSheet['!cols'] = [
    { wch: 5 },  // No. 
    { wch: 12 }, // Employee ID
    { wch: 20 }, // Name
    { wch: 15 }, // Department
    { wch: 12 }, // Date
    { wch: 12 }, // Check In
    { wch: 12 }, // Check Out
    { wch:  12 }, // Duration
    { wch: 10 }, // Status
    { wch:  12 }, // Total Days
    { wch: 12 }, // Present Days
    { wch:  12 }, // Absent Days
    { wch: 12 }, // Late Days
    { wch: 12 }, // Attendance %
  ];

  XLSX.utils.book_append_sheet(workbook, detailSheet, 'Details');
  
  const fileName = `Report_${reportType}_${startDate || 'all'}_${endDate || 'dates'}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

/**
 * Export daily report to Excel
 */
export const exportDailyReportToExcel = (data, date) => {
  if (!data || data.length === 0) {
    console.warn('No daily report data to export');
    return;
  }

  const workbook = XLSX.utils. book_new();
  
  const exportData = data.map((record, index) => ({
    'No.': index + 1,
    'Employee ID': record.employeeId || 'N/A',
    'Name':  record.name || 'N/A',
    'Department': record.department || 'N/A',
    'Check In': record.checkIn ? new Date(record.checkIn).toLocaleTimeString() : 'N/A',
    'Check Out': record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : 'Not yet',
    'Duration': record.duration || 'N/A',
    'Status': record. status || 'N/A',
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  
  worksheet['!cols'] = [
    { wch: 5 },
    { wch: 12 },
    { wch: 20 },
    { wch: 15 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
  ];

  XLSX.utils. book_append_sheet(workbook, worksheet, 'Daily Report');
  
  const fileName = `Daily_Report_${date || new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

/**
 * Export monthly report to Excel
 */
export const exportMonthlyReportToExcel = (data, month, year) => {
  if (!data || data.length === 0) {
    console.warn('No monthly report data to export');
    return;
  }

  const workbook = XLSX. utils.book_new();
  
  const exportData = data. map((record, index) => ({
    'No.': index + 1,
    'Employee ID': record.employeeId || 'N/A',
    'Name': record.name || 'N/A',
    'Department': record.department || 'N/A',
    'Total Days': record.totalDays || 0,
    'Present':  record.presentDays || 0,
    'Absent': record.absentDays || 0,
    'Late': record. lateDays || 0,
    'Attendance %': record. attendancePercentage ?  `${record.attendancePercentage}%` : 'N/A',
    'Total Hours': record.totalHours || 'N/A',
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  
  worksheet['!cols'] = [
    { wch: 5 },
    { wch:  12 },
    { wch: 20 },
    { wch: 15 },
    { wch: 12 },
    { wch:  10 },
    { wch:  10 },
    { wch:  10 },
    { wch: 15 },
    { wch: 12 },
  ];

  XLSX.utils. book_append_sheet(workbook, worksheet, 'Monthly Report');
  
  const fileName = `Monthly_Report_${month}_${year}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

/**
 * Helper function to calculate duration
 */
const calculateDuration = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 'N/A';
  
  try {
    const diff = new Date(checkOut) - new Date(checkIn);
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  } catch (error) {
    return 'N/A';
  }
};

/**
 * Export to CSV (alternative to Excel)
 */
export const exportToCSV = (data, filename) => {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body. appendChild(link);
    link.click();
    document.body. removeChild(link);
  }
};

/**
 * Print data (opens print dialog)
 */
export const printData = (data, title) => {
  const printWindow = window.open('', '', 'height=600,width=800');
  
  printWindow.document.write('<html><head><title>' + title + '</title>');
  printWindow.document.write('<style>');
  printWindow.document.write(`
    body { font-family: Arial, sans-serif; padding: 20px; }
    h1 { color: #333; border-bottom: 2px solid #4F46E5; padding-bottom:  10px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background-color: #4F46E5; color: white; font-weight: bold; }
    tr:nth-child(even) { background-color: #f9f9f9; }
    tr:hover { background-color: #f5f5f5; }
    @media print {
      button { display: none; }
    }
  `);
  printWindow.document.write('</style></head><body>');
  printWindow.document.write('<h1>' + title + '</h1>');
  printWindow.document. write('<p>Generated on: ' + new Date().toLocaleString() + '</p>');
  
  if (data && data.length > 0) {
    printWindow.document.write('<table>');
    
    // Table headers
    printWindow.document.write('<thead><tr>');
    Object.keys(data[0]).forEach(key => {
      printWindow.document.write('<th>' + key + '</th>');
    });
    printWindow.document.write('</tr></thead>');
    
    // Table body
    printWindow.document.write('<tbody>');
    data.forEach(row => {
      printWindow. document.write('<tr>');
      Object.values(row).forEach(value => {
        printWindow.document.write('<td>' + value + '</td>');
      });
      printWindow.document. write('</tr>');
    });
    printWindow.document. write('</tbody>');
    
    printWindow.document.write('</table>');
  } else {
    printWindow. document.write('<p>No data to display</p>');
  }
  
  printWindow.document.write('</body></html>');
  printWindow.document.close();
  printWindow.print();
};

// ✅ ALIASES FOR BACKWARD COMPATIBILITY
export const exportReportToExcel = exportReportsToExcel;