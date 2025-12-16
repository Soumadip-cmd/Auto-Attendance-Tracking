import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

// Export data to Excel
export const exportToExcel = (data, filename = 'export') => {
  try {
    // Create a new workbook
    const wb = XLSX.utils.book_new();
    
    // Convert data to worksheet
    const ws = XLSX. utils.json_to_sheet(data);
    
    // Set column widths
    const cols = Object.keys(data[0] || {}).map(() => ({ wch: 20 }));
    ws['!cols'] = cols;
    
    // Add worksheet to workbook
    XLSX.utils. book_append_sheet(wb, ws, 'Sheet1');
    
    // Generate Excel file and trigger download
    XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast.success(`✅ Exported ${data.length} records to Excel!`);
  } catch (error) {
    console.error('Export error:', error);
    toast.error('❌ Failed to export data');
  }
};
// Export attendance data to Excel
export const exportAttendanceToExcel = (records, date) => {
  const data = records.map((record) => ({
    'Employee ID': record.employee. employeeId,
    'First Name': record.employee.firstName,
    'Last Name': record. employee.lastName,
    'Check In': record.checkIn ?  new Date(record.checkIn).toLocaleTimeString() : '-',
    'Check Out': record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : '-',
    'Duration': calculateDuration(record.checkIn, record.checkOut),
    'Status': record.status,
    'Location': record.location || '-',
  }));

  exportToExcel(data, `attendance_${date}`);
};

// Export employees to Excel
export const exportEmployeesToExcel = (employees) => {
  const data = employees.map((emp) => ({
    'Employee ID': emp.employeeId,
    'First Name': emp.firstName,
    'Last Name': emp.lastName,
    'Email': emp.email,
    'Phone': emp.phoneNumber || '-',
    'Department': emp.department,
    'Role': emp.role,
    'Status': emp.isActive ? 'Active' : 'Inactive',
  }));

  exportToExcel(data, 'employees');
};

// Export report data to Excel
export const exportReportToExcel = (reportData, reportType) => {
  const data = [
    {
      'Report Type': reportType. toUpperCase(),
      'Period': reportData.period,
      'Total Employees': reportData.totalEmployees,
      'Average Attendance': `${reportData.avgAttendance}%`,
      'Total Present': reportData.totalPresent,
      'Total Late': reportData.totalLate,
      'Total Absent': reportData.totalAbsent,
    },
  ];

  exportToExcel(data, `${reportType}_report`);
};

// Helper function to calculate duration
const calculateDuration = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return '-';
  const duration = new Date(checkOut) - new Date(checkIn);
  const hours = Math.floor(duration / (1000 * 60 * 60));
  const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
};