import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { reportAPI, userAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import {
  FileText,
  Download,
  Filter,
  Calendar,
  Search,
  Users,
  TrendingUp,
  BarChart3,
  Printer,
} from 'lucide-react';
import { TableSkeleton, StatsCardSkeleton } from '../components/common/Skeleton';
import { exportReportsToExcel, printData } from '../utils/exportUtils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const Reports = () => {
  const { setPageTitle } = useOutletContext();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Filters
  const [reportType, setReportType] = useState('daily');
  const [startDate, setStartDate] = useState(() => {
    // Initialize with today's date
    return new Date().toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    // Initialize with today's date
    return new Date().toISOString().split('T')[0];
  });
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Stats
  const [stats, setStats] = useState({
    totalRecords: 0,
    totalPresent: 0,
    totalAbsent: 0,
    totalLate: 0,
    averageAttendance: 0,
  });

  useEffect(() => {
    setPageTitle('Reports');
    fetchEmployees();
  }, [setPageTitle]);

  useEffect(() => {
    if (reportType && startDate) {
      console.log('📊 Generating report:', { reportType, startDate, endDate });
      generateReport();
    }
  }, [reportType, startDate, endDate, selectedEmployee, selectedDepartment]);

  const fetchEmployees = async () => {
    try {
      const response = await userAPI.getAll();
      const employeeList = response.data.data || [];
      setEmployees(employeeList);

      // Extract unique departments
      const uniqueDepts = [...new Set(employeeList.map(emp => emp.department))];
      setDepartments(uniqueDepts. filter(Boolean));
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const generateReport = async () => {
    try {
      setLoading(true);
      console.log('📊 Generating report:', reportType, 'for', startDate);
      let response;

      switch (reportType) {
        case 'daily':
          response = await reportAPI.getDaily(startDate);
          break;
        case 'weekly':
          response = await reportAPI.getWeekly(startDate, endDate);
          break;
        case 'monthly':
          const [year, month] = startDate.split('-');
          response = await reportAPI.getMonthly(month, year);
          break;
        case 'custom':
          response = await reportAPI.getCustomReport({
            startDate,
            endDate,
            employee: selectedEmployee,
            department: selectedDepartment,
          });
          break;
        default: 
          response = await reportAPI.getDaily(startDate);
      }

      console.log('📊 Report response:', response.data);

      // Handle both nested and direct data formats
      const data = response.data?.data || [];
      console.log(`✅ Report data count: ${data.length}`);
      
      setReportData(data);
      calculateStats(data);
    } catch (error) {
      console.error('❌ Error generating report:', error);
      toast.error('Failed to generate report');
      setReportData([]);
      setStats({
        totalRecords: 0,
        totalPresent: 0,
        totalAbsent: 0,
        totalLate: 0,
        averageAttendance: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    if (!Array.isArray(data) || data.length === 0) {
      setStats({
        totalRecords: 0,
        totalPresent: 0,
        totalAbsent: 0,
        totalLate: 0,
        averageAttendance: 0,
      });
      return;
    }

    const totalPresent = data.filter(r => r.status === 'present').length;
    const totalLate = data.filter(r => r.status === 'late').length;
    const totalAbsent = data.filter(r => r.status === 'absent').length;
    const averageAttendance = data.length > 0 
      ? ((totalPresent + totalLate) / data.length * 100).toFixed(1)
      : 0;

    setStats({
      totalRecords: data.length,
      totalPresent,
      totalAbsent,
      totalLate,
      averageAttendance,
    });
  };

  const handleExport = () => {
    if (reportData.length === 0) {
      toast.error('No data to export');
      return;
    }
    exportReportsToExcel(reportData, reportType, startDate, endDate);
    toast.success('Report exported successfully! ');
  };

  const handlePrint = () => {
    if (reportData.length === 0) {
      toast.error('No data to print');
      return;
    }

    const printableData = reportData.map((record, index) => ({
      'No. ': index + 1,
      'Employee': record.name || `${record.employee?.firstName || ''} ${record.employee?.lastName || ''}`,
      'Department': record.department || record.employee?.department || 'N/A',
      'Date':  record.date ?  new Date(record.date).toLocaleDateString() : 'N/A',
      'Status':  record.status || 'N/A',
      'Check In': record.checkIn ? new Date(record.checkIn).toLocaleTimeString() : 'N/A',
      'Check Out': record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : 'N/A',
    }));

    printData(printableData, `${reportType. toUpperCase()} Report - ${startDate} to ${endDate}`);
  };

  const filteredReportData = reportData.filter((record) => {
    const matchesSearch = searchTerm
      ? (record.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         record.employee?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         record.employee?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         record.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()))
      : true;

    return matchesSearch;
  });

  // Prepare chart data
  const chartData = [
    { name: 'Present', value: stats.totalPresent, fill: '#10B981' },
    { name: 'Late', value: stats.totalLate, fill: '#F59E0B' },
    { name: 'Absent', value: stats.totalAbsent, fill: '#EF4444' },
  ].filter(item => item.value > 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <StatsCardSkeleton key={i} />
          ))}
        </div>
        <TableSkeleton rows={8} columns={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-8 h-8 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark: text-gray-400">
              Reports & Analytics
            </h1>
            <p className="text-sm text-gray-600 dark: text-gray-400">
              Generate and export attendance reports
            </p>
          </div>
        </div>
      </div>

      {/* Filters Card */}
      <div className="card">
        <div className="grid grid-cols-1 md: grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Report Type */}
          <div>
            <label className="label">Report Type</label>
            <select
              className="input"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
            >
              <option value="daily">Daily Report</option>
              <option value="weekly">Weekly Report</option>
              <option value="monthly">Monthly Report</option>
              <option value="custom">Custom Report</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="label">
              {reportType === 'daily' ? 'Date' : 'Start Date'}
            </label>
            <div className="relative">
              <Calendar className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="date"
                className="pl-10 input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>

          {/* End Date (for weekly/custom) */}
          {(reportType === 'weekly' || reportType === 'custom') && (
            <div>
              <label className="label">End Date</label>
              <div className="relative">
                <Calendar className="w-5 h-5 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="date"
                  className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-full"
                  value={startDate}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {startDate && new Date(startDate + 'T00:00:00').toLocaleDateString('en-GB', { 
                  day: '2-digit', 
                  month: '2-digit', 
                  year: 'numeric' 
                })}
              </p>
            </div>
          )}

          {/* Department Filter (for custom) */}
          {reportType === 'custom' && (
            <div>
              <label className="label">Department</label>
              <select
                className="input"
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Employee Filter (for custom) */}
          {reportType === 'custom' && (
            <div>
              <label className="label">Employee</label>
              <select
                className="input"
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target. value)}
              >
                <option value="">All Employees</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.firstName} {emp.lastName}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search reports..."
              className="pl-10 input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={generateReport}
            className="btn-primary flex items-center gap-2"
            disabled={loading}
          >
            <BarChart3 className="w-4 h-4" />
            Generate Report
          </button>
          <button
            onClick={handleExport}
            className="btn-secondary flex items-center gap-2"
            disabled={filteredReportData.length === 0}
          >
            <Download className="w-4 h-4" />
            Export Excel
          </button>
          <button
            onClick={handlePrint}
            className="btn-secondary flex items-center gap-2"
            disabled={filteredReportData.length === 0}
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="card">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            Total Records
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {stats.totalRecords}
          </p>
        </div>

        <div className="card">
          <p className="text-sm text-gray-600 dark: text-gray-400 mb-1">
            Present
          </p>
          <p className="text-3xl font-bold text-green-600">
            {stats.totalPresent}
          </p>
        </div>

        <div className="card">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            Late
          </p>
          <p className="text-3xl font-bold text-yellow-600">
            {stats. totalLate}
          </p>
        </div>

        <div className="card">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            Absent
          </p>
          <p className="text-3xl font-bold text-red-600">
            {stats.totalAbsent}
          </p>
        </div>

        <div className="card">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            Attendance %
          </p>
          <p className="text-3xl font-bold text-primary-600">
            {stats. averageAttendance}%
          </p>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            Attendance Overview
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#4F46E5" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Report Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark: bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark: text-gray-400 uppercase">
                  #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Check In
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Check Out
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredReportData.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No report data available.  Generate a report to see results.</p>
                  </td>
                </tr>
              ) : (
                filteredReportData.map((record, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {record.name || `${record.employee?.firstName || ''} ${record.employee?. lastName || ''}`}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {record.employeeId || record.employee?.employeeId || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {record.department || record.employee?.department || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {record.date ? new Date(record. date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          record.status === 'present'
                            ?  'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : record.status === 'late'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                      >
                        {record.status || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {record.checkIn ? new Date(record.checkIn).toLocaleTimeString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark: text-white">
                      {record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : 'Not yet'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;