import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  TrendingUp, Download, Calendar, Users, Clock, 
  FileText, BarChart3, PieChart, Filter 
} from 'lucide-react';
import { reportsAPI, attendanceAPI } from '../services/api';

const Reports = () => {
  const { setPageTitle } = useOutletContext();
  const [reportType, setReportType] = useState('daily');
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    setPageTitle('Reports');
  }, [setPageTitle]);

  const reportTypes = [
    { value:  'daily', label: 'Daily Report', icon: Calendar },
    { value: 'weekly', label: 'Weekly Report', icon: BarChart3 },
    { value: 'monthly', label:  'Monthly Report', icon: PieChart },
    { value:  'custom', label: 'Custom Range', icon: Filter },
  ];

  const generateReport = async () => {
    setLoading(true);
    try {
      // Mock report data for development
      setReportData({
        summary: {
          totalEmployees: 50,
          totalPresent: 42,
          totalAbsent: 5,
          totalLate: 3,
          averageAttendance: 84,
          averageWorkHours: 8.2,
        },
        departmentWise: [
          { department: 'IT', present: 18, absent: 2, late:  1 },
          { department: 'HR', present: 8, absent: 1, late: 0 },
          { department: 'Sales', present: 12, absent: 1, late: 2 },
          { department: 'Marketing', present: 4, absent: 1, late:  0 },
        ],
        topPerformers: [
          { name: 'John Doe', attendance: 100, workHours: 176 },
          { name: 'Jane Smith', attendance: 98, workHours: 172 },
          { name: 'Mike Johnson', attendance: 96, workHours: 168 },
        ],
      });
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = (format) => {
    alert(`Exporting report as ${format. toUpperCase()}...`);
    // Implement actual export functionality
  };

  return (
    <div className="space-y-6">
      {/* Report Configuration */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Generate Report</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {reportTypes.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.value}
                onClick={() => setReportType(type.value)}
                className={`p-4 border-2 rounded-xl transition-all ${
                  reportType === type. value
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                <Icon className={`w-6 h-6 mb-2 ${
                  reportType === type.value ? 'text-primary-600' : 'text-gray-400'
                }`} />
                <p className="font-medium text-sm">{type.label}</p>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 grid grid-cols-1 sm: grid-cols-2 gap-4">
            <div>
              <label className="label">Start Date</label>
              <input
                type="date"
                className="input"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e. target.value })}
              />
            </div>
            <div>
              <label className="label">End Date</label>
              <input
                type="date"
                className="input"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              />
            </div>
          </div>
          <button
            onClick={generateReport}
            disabled={loading}
            className="btn-primary flex items-center gap-2"
          >
            <TrendingUp className="w-4 h-4" />
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
      </div>

      {/* Report Results */}
      {reportData && (
        <>
          {/* Export Actions */}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => exportReport('pdf')}
              className="btn-secondary flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export as PDF
            </button>
            <button
              onClick={() => exportReport('excel')}
              className="btn-secondary flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export as Excel
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="card">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Total Employees</p>
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{reportData.summary.totalEmployees}</p>
            </div>
            
            <div className="card">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Present</p>
                <div className="bg-green-100 p-2 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-green-600">{reportData.summary.totalPresent}</p>
              <p className="text-xs text-gray-500 mt-1">
                {((reportData.summary.totalPresent / reportData.summary.totalEmployees) * 100).toFixed(1)}% attendance
              </p>
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Absent</p>
                <div className="bg-red-100 p-2 rounded-lg">
                  <Users className="w-5 h-5 text-red-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-red-600">{reportData.summary.totalAbsent}</p>
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Late Arrivals</p>
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <p className="text-3xl font-bold text-yellow-600">{reportData.summary.totalLate}</p>
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Avg Attendance</p>
                <BarChart3 className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-3xl font-bold text-purple-600">{reportData.summary.averageAttendance}%</p>
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Avg Work Hours</p>
                <Clock className="w-5 h-5 text-indigo-600" />
              </div>
              <p className="text-3xl font-bold text-indigo-600">{reportData.summary.averageWorkHours}h</p>
            </div>
          </div>

          {/* Department-wise Report */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Department-wise Attendance</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Present</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Absent</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Late</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Attendance %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {reportData.departmentWise.map((dept, index) => {
                    const total = dept.present + dept.absent + dept.late;
                    const percentage = ((dept.present / total) * 100).toFixed(1);
                    return (
                      <tr key={index} className="hover: bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{dept.department}</td>
                        <td className="px-6 py-4 text-center text-green-600 font-semibold">{dept.present}</td>
                        <td className="px-6 py-4 text-center text-red-600 font-semibold">{dept.absent}</td>
                        <td className="px-6 py-4 text-center text-yellow-600 font-semibold">{dept. late}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <div className="flex-1 max-w-[100px] bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-green-500 h-2 rounded-full"
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium text-gray-700">{percentage}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Performers */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performers</h3>
            <div className="space-y-4">
              {reportData.topPerformers.map((performer, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-primary-700 font-bold">{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{performer.name}</p>
                      <p className="text-sm text-gray-500">{performer.workHours} work hours</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">{performer.attendance}%</p>
                    <p className="text-xs text-gray-500">Attendance</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Empty State */}
      {!reportData && ! loading && (
        <div className="card">
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Report Generated</h3>
            <p className="text-gray-500 mb-6">
              Select a report type and date range, then click "Generate Report" to view analytics
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;