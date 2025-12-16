import { TableSkeleton, StatsCardSkeleton } from '../components/common/Skeleton';
import { exportAttendanceToExcel } from '../utils/exportUtils';
import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Calendar, Search, Download, CheckCircle, XCircle, 
  Clock, MapPin, Filter 
} from 'lucide-react';
import { attendanceAPI } from '../services/api';

const Attendance = () => {
  const { setPageTitle } = useOutletContext();
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    present: 0,
    late: 0,
    absent:  0,
  });

  useEffect(() => {
    setPageTitle('Attendance');
    fetchAttendance();
  }, [setPageTitle, selectedDate]);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      // Mock data for development
      setAttendanceRecords([
        {
          _id: '1',
          employee: {
            firstName: 'John',
            lastName: 'Doe',
            employeeId: 'EMP001',
          },
          checkIn: '2025-12-17T09:00:00Z',
          checkOut: '2025-12-17T17:30:00Z',
          status: 'present',
          location: 'Office',
        },
        {
          _id: '2',
          employee:  {
            firstName: 'Jane',
            lastName: 'Smith',
            employeeId: 'EMP002',
          },
          checkIn: '2025-12-17T09:15:00Z',
          checkOut: '2025-12-17T17:45:00Z',
          status: 'late',
          location: 'Office',
        },
      ]);
      setStats({
        total: 50,
        present: 42,
        late: 3,
        absent: 5,
      });
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = attendanceRecords.filter((record) => {
    const matchesSearch = 
      record.employee.firstName. toLowerCase().includes(searchTerm. toLowerCase()) ||
      record.employee.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.employee.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || record. status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    const badges = {
      present: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      late: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      absent: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    return badges[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  const formatTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateDuration = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return '-';
    const duration = new Date(checkOut) - new Date(checkIn);
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

 if (loading) {
  return (
    <div className="space-y-6">
      {/* Header Actions Skeleton */}
      <div className="flex gap-4">
        <div className="w-48 h-10 animate-pulse bg-gray-200 dark: bg-gray-700 rounded-lg"></div>
        <div className="flex-1 h-10 animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        <div className="w-32 h-10 animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        <div className="w-32 h-10 animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
      </div>

      {/* Stats Skeleton */}
      <div className="grid grid-cols-1 sm: grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <StatsCardSkeleton key={i} />
        ))}
      </div>

      {/* Table Skeleton */}
      <TableSkeleton rows={10} columns={6} />
    </div>
  );
}

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex gap-4 flex-1 w-full">
          {/* Date Picker */}
          <div className="relative">
            <Calendar className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="date"
              className="pl-10 input"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search employees..."
              className="pl-10 input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <select
            className="input max-w-xs"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="present">Present</option>
            <option value="late">Late</option>
            <option value="absent">Absent</option>
          </select>
        </div>

        {/* Export Button */}
        {/* Export Button */}
          <button 
            onClick={() => exportAttendanceToExcel(filteredRecords, selectedDate)}
            className="btn-primary flex items-center gap-2 whitespace-nowrap"
            disabled={filteredRecords.length === 0}
          >
            <Download className="w-4 h-4" />
            Export Report
          </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        <div className="card flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total</p>
            <p className="text-3xl font-bold text-gray-900 dark: text-white">{stats.total}</p>
          </div>
          <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-lg">
            <Calendar className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        <div className="card flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Present</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.present}</p>
          </div>
          <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-lg">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
        </div>

        <div className="card flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Late</p>
            <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{stats.late}</p>
          </div>
          <div className="bg-yellow-100 dark:bg-yellow-900/30 p-4 rounded-lg">
            <Clock className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
          </div>
        </div>

        <div className="card flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Absent</p>
            <p className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.absent}</p>
          </div>
          <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-lg">
            <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark: text-gray-400 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Check In
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Check Out
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark: text-gray-400 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Location
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark: bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    No attendance records found for this date
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                          <span className="text-primary-700 dark:text-primary-400 font-semibold text-sm">
                            {record.employee.firstName[0]}{record.employee.lastName[0]}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {record.employee.firstName} {record.employee. lastName}
                          </div>
                          <div className="text-sm text-gray-500 dark: text-gray-400">
                            {record.employee.employeeId}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 dark:text-white">
                        {formatTime(record.checkIn)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 dark:text-white">
                        {formatTime(record. checkOut)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 dark:text-white">
                        {calculateDuration(record.checkIn, record.checkOut)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(record.status)}`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm text-gray-900 dark:text-white">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        {record. location}
                      </div>
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

export default Attendance;