import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Calendar, BarChart3, PieChart, Filter, Download, 
  TrendingUp, FileText 
} from 'lucide-react';
import { exportReportToExcel } from '../utils/exportUtils';

const Reports = () => {
  const { setPageTitle } = useOutletContext();
  const [selectedReport, setSelectedReport] = useState('daily');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPageTitle('Reports');
  }, [setPageTitle]);

  const generateReport = async () => {
    setLoading(true);
    setReportData(null); // Clear previous data
    try {
      // Mock report generation with delay to show skeleton
      await new Promise(resolve => setTimeout(resolve, 2000));
      setReportData({
        type: selectedReport,
        period: `${startDate} to ${endDate}`,
        totalEmployees: 50,
        avgAttendance: 92,
        totalPresent:  1260,
        totalAbsent:  110,
        totalLate: 45,
      });
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Report Type Selection */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Generate Report</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Daily Report */}
          <button
            onClick={() => setSelectedReport('daily')}
            className={`p-6 rounded-xl border-2 transition-all ${
              selectedReport === 'daily'
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700'
            }`}
          >
            <Calendar className={`w-8 h-8 mb-3 ${
              selectedReport === 'daily' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'
            }`} />
            <h4 className={`font-semibold mb-1 ${
              selectedReport === 'daily' ? 'text-primary-900 dark: text-primary-300' : 'text-gray-900 dark:text-white'
            }`}>
              Daily Report
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">View attendance for a specific day</p>
          </button>

          {/* Weekly Report */}
          <button
            onClick={() => setSelectedReport('weekly')}
            className={`p-6 rounded-xl border-2 transition-all ${
              selectedReport === 'weekly'
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover: border-primary-700'
            }`}
          >
            <BarChart3 className={`w-8 h-8 mb-3 ${
              selectedReport === 'weekly' ?  'text-primary-600 dark:text-primary-400' : 'text-gray-400'
            }`} />
            <h4 className={`font-semibold mb-1 ${
              selectedReport === 'weekly' ? 'text-primary-900 dark:text-primary-300' : 'text-gray-900 dark:text-white'
            }`}>
              Weekly Report
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">Analyze weekly attendance trends</p>
          </button>

          {/* Monthly Report */}
          <button
            onClick={() => setSelectedReport('monthly')}
            className={`p-6 rounded-xl border-2 transition-all ${
              selectedReport === 'monthly'
                ?  'border-primary-500 bg-primary-50 dark: bg-primary-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700'
            }`}
          >
            <PieChart className={`w-8 h-8 mb-3 ${
              selectedReport === 'monthly' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'
            }`} />
            <h4 className={`font-semibold mb-1 ${
              selectedReport === 'monthly' ? 'text-primary-900 dark:text-primary-300' : 'text-gray-900 dark:text-white'
            }`}>
              Monthly Report
            </h4>
            <p className="text-sm text-gray-600 dark: text-gray-400">Monthly attendance summary</p>
          </button>

          {/* Custom Report */}
          <button
            onClick={() => setSelectedReport('custom')}
            className={`p-6 rounded-xl border-2 transition-all ${
              selectedReport === 'custom'
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'border-gray-200 dark: border-gray-700 hover: border-primary-300 dark: hover:border-primary-700'
            }`}
          >
            <Filter className={`w-8 h-8 mb-3 ${
              selectedReport === 'custom' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'
            }`} />
            <h4 className={`font-semibold mb-1 ${
              selectedReport === 'custom' ? 'text-primary-900 dark: text-primary-300' : 'text-gray-900 dark:text-white'
            }`}>
              Custom Report
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">Create custom date range report</p>
          </button>
        </div>

        {/* Date Range Selection */}
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="label">Start Date</label>
            <input
              type="date"
              className="input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="label">End Date</label>
            <input
              type="date"
              className="input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <button
            onClick={generateReport}
            disabled={loading}
            className="btn-primary flex items-center gap-2 whitespace-nowrap"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Generating...
              </>
            ) : (
              <>
                <TrendingUp className="w-4 h-4" />
                Generate Report
              </>
            )}
          </button>
        </div>
      </div>

      {/* Report Results */}
      <div className="card min-h-[400px] flex items-center justify-center">
        {loading ? (
          // Loading Skeleton
          <div className="w-full space-y-6">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-6 w-48 animate-pulse bg-gray-200 dark: bg-gray-700 rounded"></div>
                <div className="h-4 w-32 animate-pulse bg-gray-200 dark: bg-gray-700 rounded"></div>
              </div>
              <div className="h-10 w-32 animate-pulse bg-gray-200 dark: bg-gray-700 rounded-lg"></div>
            </div>

            {/* Stats Grid Skeleton */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="p-4 animate-pulse bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <div className="h-4 w-24 bg-gray-200 dark:bg-gray-600 rounded mb-2"></div>
                  <div className="h-8 w-16 bg-gray-200 dark:bg-gray-600 rounded"></div>
                </div>
              ))}
            </div>

            {/* Table Skeleton */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="bg-gray-50 dark:bg-gray-900 p-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-4 bg-gray-200 dark: bg-gray-700 rounded"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              </div>
              {[...Array(3)].map((_, i) => (
                <div key={i} className="p-4 border-t border-gray-200 dark: border-gray-700">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    <div className="h-4 bg-gray-200 dark: bg-gray-700 rounded animate-pulse"></div>
                    <div className="h-4 bg-gray-200 dark: bg-gray-700 rounded animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : ! reportData ? (
          // No Report State
          <div className="text-center">
            <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Report Generated</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              Select a report type and date range, then click "Generate Report" to view analytics
            </p>
          </div>
        ) : (
          // Report Display
          <div className="w-full">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white capitalize">
                  {reportData. type} Report
                </h3>
                <p className="text-sm text-gray-600 dark: text-gray-400">{reportData.period}</p>
              </div>
              <button 
                onClick={() => exportReportToExcel(reportData, reportData.type)}
                className="btn-secondary flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export Excel
              </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">Total Employees</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">{reportData.totalEmployees}</p>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-green-600 dark:text-green-400 mb-1">Avg Attendance</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-300">{reportData.avgAttendance}%</p>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <p className="text-sm text-purple-600 dark:text-purple-400 mb-1">Total Present</p>
                <p className="text-2xl font-bold text-purple-900 dark: text-purple-300">{reportData.totalPresent}</p>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400 mb-1">Total Absent</p>
                <p className="text-2xl font-bold text-red-900 dark:text-red-300">{reportData.totalAbsent}</p>
              </div>
            </div>

            {/* Summary Table */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Metric</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Value</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Percentage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  <tr className="bg-white dark:bg-gray-800">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">Present</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{reportData.totalPresent}</td>
                    <td className="px-4 py-3 text-sm text-green-600 dark:text-green-400 font-medium">
                      {((reportData.totalPresent / (reportData.totalPresent + reportData.totalAbsent + reportData.totalLate)) * 100).toFixed(1)}%
                    </td>
                  </tr>
                  <tr className="bg-white dark:bg-gray-800">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">Late</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{reportData.totalLate}</td>
                    <td className="px-4 py-3 text-sm text-yellow-600 dark:text-yellow-400 font-medium">
                      {((reportData.totalLate / (reportData.totalPresent + reportData.totalAbsent + reportData.totalLate)) * 100).toFixed(1)}%
                    </td>
                  </tr>
                  <tr className="bg-white dark:bg-gray-800">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">Absent</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{reportData.totalAbsent}</td>
                    <td className="px-4 py-3 text-sm text-red-600 dark: text-red-400 font-medium">
                      {((reportData.totalAbsent / (reportData.totalPresent + reportData.totalAbsent + reportData.totalLate)) * 100).toFixed(1)}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;