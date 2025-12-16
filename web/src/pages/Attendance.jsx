import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Calendar, Clock, MapPin, CheckCircle, XCircle, 
  Filter, Download, ChevronDown, Search 
} from 'lucide-react';
import { attendanceAPI } from '../services/api';
import { formatDate, formatTime, calculateDuration } from '../utils/helpers';

const Attendance = () => {
  const { setPageTitle } = useOutletContext();
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setPageTitle('Attendance');
    fetchAttendance();
  }, [setPageTitle, selectedDate]);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const response = await attendanceAPI.getAll({ date: selectedDate });
      setAttendanceRecords(response. data. data || []);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      // Mock data for development
      setAttendanceRecords([
        {
          _id: '1',
          user: {
            _id: '1',
            firstName: 'Admin',
            lastName: 'User',
            employeeId: 'EMP001',
          },
          date: new Date().toISOString(),
          checkIn: new Date('2025-12-16T09:00:00').toISOString(),
          checkOut: new Date('2025-12-16T17:30:00').toISOString(),
          status: 'present',
          workDuration: '8h 30m',
          location: {
            checkIn: { address: 'Office, Main Building' },
            checkOut: { address: 'Office, Main Building' },
          },
        },
        {
          _id: '2',
          user: {
            _id: '2',
            firstName: 'John',
            lastName: 'Doe',
            employeeId: 'EMP002',
          },
          date: new Date().toISOString(),
          checkIn:  new Date('2025-12-16T09:15:00').toISOString(),
          checkOut: new Date('2025-12-16T17:00:00').toISOString(),
          status: 'late',
          workDuration: '7h 45m',
          location: {
            checkIn:  { address: 'Office, Main Building' },
            checkOut:  { address: 'Office, Main Building' },
          },
        },
        {
          _id: '3',
          user:  {
            _id: '3',
            firstName: 'Jane',
            lastName: 'Smith',
            employeeId: 'EMP003',
          },
          date: new Date().toISOString(),
          checkIn: null,
          checkOut: null,
          status: 'absent',
          workDuration: '0h 0m',
          location: null,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      present: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Present' },
      late: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Late' },
      absent: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Absent' },
      'half-day': { color: 'bg-blue-100 text-blue-800', icon: Clock, label: 'Half Day' },
      leave: { color: 'bg-purple-100 text-purple-800', icon: Calendar, label: 'On Leave' },
    };
    return badges[status] || badges. absent;
  };

  const filteredRecords = attendanceRecords.filter((record) => {
    const matchesSearch = 
      record.user.firstName. toLowerCase().includes(searchTerm. toLowerCase()) ||
      record.user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.user.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || record.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: attendanceRecords.length,
    present: attendanceRecords.filter(r => r.status === 'present').length,
    late: attendanceRecords.filter(r => r.status === 'late').length,
    absent: attendanceRecords.filter(r => r.status === 'absent').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
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
            <option value="half-day">Half Day</option>
            <option value="leave">On Leave</option>
          </select>
        </div>

        {/* Export Button */}
        <button className="btn-secondary flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export Report
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Present</p>
              <p className="text-2xl font-bold text-green-600">{stats.present}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Late</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.late}</p>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Absent</p>
              <p className="text-2xl font-bold text-red-600">{stats. absent}</p>
            </div>
            <div className="bg-red-50 p-3 rounded-lg">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check In
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check Out
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    No attendance records found for this date
                  </td>
                </tr>
              ) : (
                filteredRecords. map((record) => {
                  const statusBadge = getStatusBadge(record.status);
                  const StatusIcon = statusBadge.icon;

                  return (
                    <tr key={record._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                            <span className="text-primary-700 font-semibold text-sm">
                              {record.user.firstName[0]}{record.user.lastName[0]}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {record.user. firstName} {record.user.lastName}
                            </div>
                            <div className="text-sm text-gray-500 font-mono">
                              {record.user.employeeId}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {record.checkIn ? (
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900">
                              {formatTime(record.checkIn)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {record. checkOut ? (
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900">
                              {formatTime(record.checkOut)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          {record.workDuration}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusBadge.color} flex items-center gap-1 w-fit`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {record.location?. checkIn?.address ?  (
                          <div className="flex items-start gap-2 text-sm text-gray-600 max-w-xs">
                            <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                            <span className="line-clamp-2">
                              {record.location.checkIn.address}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Attendance;