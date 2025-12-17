import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { attendanceAPI, userAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import { 
  Calendar, Clock, User, CheckCircle, XCircle, 
  AlertCircle, Filter, Download, Plus, Search,
  MapPin, Edit2, Trash2
} from 'lucide-react';
import { TableSkeleton, StatsCardSkeleton } from '../components/common/Skeleton';
import { exportAttendanceToExcel } from '../utils/exportUtils';
import ConfirmDialog from '../components/common/ConfirmDialog';

const Attendance = () => {
  const { setPageTitle } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState({
    present: 0,
    absent:  0,
    late: 0,
    total: 0,
  });
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showMarkAttendanceModal, setShowMarkAttendanceModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, record: null });

  useEffect(() => {
    setPageTitle('Attendance Management');
    fetchData();
  }, [setPageTitle, selectedDate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [attendanceRes, employeesRes] = await Promise.all([
        attendanceAPI.getByDate(selectedDate),
        userAPI.getAll(),
      ]);

      const records = attendanceRes.data.data || [];
      const allEmployees = employeesRes. data.data || [];

      setAttendanceRecords(records);
      setEmployees(allEmployees);

      // Calculate stats
      const present = records.filter(r => r.checkIn?.time).length;
      const late = records.filter(r => r.isLate).length;
      const total = allEmployees.filter(e => e.isActive).length;
      const absent = total - present;

      setStats({ present, late, absent, total });
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (employeeId) => {
    try {
      // Get geolocation
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const data = {
            employee: employeeId,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };

          await attendanceAPI.checkIn(data);
          toast.success('Checked in successfully! ');
          fetchData();
        },
        (error) => {
          toast.error('Location access denied.  Check-in requires location.');
        }
      );
    } catch (error) {
      console.error('Error checking in:', error);
      toast.error('Failed to check in');
    }
  };

  const handleCheckOut = async (recordId) => {
    try {
      await attendanceAPI.checkOut(recordId);
      toast.success('Checked out successfully! ');
      fetchData();
    } catch (error) {
      console.error('Error checking out:', error);
      toast.error('Failed to check out');
    }
  };

  const handleDelete = async () => {
    if (! deleteConfirm.record) return;

    try {
      await attendanceAPI.delete(deleteConfirm.record._id);
      toast.success('Attendance record deleted successfully! ');
      fetchData();
      setDeleteConfirm({ isOpen: false, record: null });
    } catch (error) {
      console.error('Error deleting record:', error);
      toast.error('Failed to delete record');
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateDuration = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 'N/A';
    const diff = new Date(checkOut) - new Date(checkIn);
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  };

  const getStatusBadge = (status) => {
    const styles = {
      'checked-in': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      'checked-out': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      'present': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      'late': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      'absent': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    return styles[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  const filteredRecords = attendanceRecords.filter((record) => {
    const matchesSearch = 
      record.employee?. firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.employee?.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.employee?.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || record. status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

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
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg">
              <User className="w-6 h-6 text-blue-700 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-sm text-gray-600 dark: text-gray-400 mb-1">Total Employees</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
        </div>

        <div className="card hover: shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-green-50 dark:bg-green-900/30 p-3 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-700 dark:text-green-400" />
            </div>
          </div>
          <p className="text-sm text-gray-600 dark: text-gray-400 mb-1">Present</p>
          <p className="text-3xl font-bold text-green-600">{stats.present}</p>
        </div>

        <div className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-yellow-50 dark:bg-yellow-900/30 p-3 rounded-lg">
              <AlertCircle className="w-6 h-6 text-yellow-700 dark:text-yellow-400" />
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Late</p>
          <p className="text-3xl font-bold text-yellow-600">{stats.late}</p>
        </div>

        <div className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-red-50 dark:bg-red-900/30 p-3 rounded-lg">
              <XCircle className="w-6 h-6 text-red-700 dark:text-red-400" />
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Absent</p>
          <p className="text-3xl font-bold text-red-600">{stats.absent}</p>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full">
            {/* Date Picker */}
            <div className="relative">
              <Calendar className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="pl-10 input max-w-xs"
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
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="absent">Absent</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => exportAttendanceToExcel(filteredRecords, selectedDate)}
              className="btn-secondary flex items-center gap-2"
              disabled={filteredRecords.length === 0}
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              className="btn-primary flex items-center gap-2"
              onClick={() => setShowMarkAttendanceModal(true)}
            >
              <Plus className="w-4 h-4" />
              Mark Attendance
            </button>
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
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark: divide-gray-700">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    No attendance records found for this date
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record._id} className="hover:bg-gray-50 dark: hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                          <span className="text-primary-700 dark:text-primary-400 font-semibold text-sm">
                            {record.employee?.firstName[0]}{record.employee?.lastName[0]}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {record.employee?.firstName} {record.employee?. lastName}
                          </div>
                          <div className="text-sm text-gray-500 dark: text-gray-400">
                            {record.employee?.employeeId}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900 dark:text-white">
                          {formatTime(record.checkIn?.time)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900 dark:text-white">
                          {formatTime(record.checkOut?.time)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 dark:text-white">
                        {calculateDuration(record.checkIn?.time, record.checkOut?.time)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(record.status)}`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        {record.checkIn?.time && !record.checkOut?.time && (
                          <button
                            onClick={() => handleCheckOut(record._id)}
                            className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                            title="Check Out"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteConfirm({ isOpen:  true, record })}
                          className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mark Attendance Modal */}
      {showMarkAttendanceModal && (
        <MarkAttendanceModal
          employees={employees}
          selectedDate={selectedDate}
          existingRecords={attendanceRecords}
          onClose={() => setShowMarkAttendanceModal(false)}
          onSave={() => {
            fetchData();
            setShowMarkAttendanceModal(false);
          }}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, record:  null })}
        onConfirm={handleDelete}
        title="Delete Attendance Record"
        message={`Are you sure you want to delete attendance record for ${deleteConfirm. record?.employee?.firstName} ${deleteConfirm.record?.employee?. lastName}?`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
};

// Mark Attendance Modal Component
const MarkAttendanceModal = ({ employees, selectedDate, existingRecords, onClose, onSave }) => {
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [status, setStatus] = useState('present');
  const [checkInTime, setCheckInTime] = useState('09:00');
  const [checkOutTime, setCheckOutTime] = useState('17:00');
  const [loading, setLoading] = useState(false);

  const availableEmployees = employees.filter(emp => 
    emp.isActive && ! existingRecords.some(record => record.employee?._id === emp._id)
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const checkInDate = new Date(`${selectedDate}T${checkInTime}`);
      const checkOutDate = status === 'present' || status === 'late' 
        ? new Date(`${selectedDate}T${checkOutTime}`) 
        : null;

      const data = {
        employee: selectedEmployee,
        checkIn: checkInDate. toISOString(),
        checkOut: checkOutDate?.toISOString(),
        status,
        location: {
          latitude: 0,
          longitude: 0,
          address: 'Manually marked',
        },
      };

      await attendanceAPI.create(data);
      toast.success('Attendance marked successfully! ');
      onSave();
    } catch (error) {
      console.error('Error marking attendance:', error);
      toast.error('Failed to mark attendance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900 dark: text-white">
            Mark Attendance
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Employee *</label>
            <select
              required
              className="input"
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
            >
              <option value="">Select Employee</option>
              {availableEmployees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.firstName} {emp.lastName} ({emp.employeeId})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Status *</label>
            <select
              required
              className="input"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="absent">Absent</option>
            </select>
          </div>

          {(status === 'present' || status === 'late') && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Check In Time *</label>
                  <input
                    type="time"
                    required
                    className="input"
                    value={checkInTime}
                    onChange={(e) => setCheckInTime(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Check Out Time</label>
                  <input
                    type="time"
                    className="input"
                    value={checkOutTime}
                    onChange={(e) => setCheckOutTime(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={loading || !selectedEmployee}
            >
              {loading ? 'Marking...' : 'Mark Attendance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Attendance;