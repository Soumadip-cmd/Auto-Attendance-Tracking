import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { userAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import {
  Users,
  Plus,
  Search,
  Filter,
  Download,
  Edit2,
  Trash2,
  X,
  UserPlus,
} from 'lucide-react';
import { TableSkeleton, StatsCardSkeleton } from '../components/common/Skeleton';
import { exportEmployeesToExcel } from '../utils/exportUtils';
import ConfirmDialog from '../components/common/ConfirmDialog';

const Employees = () => {
  const { setPageTitle } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pendingOnly, setPendingOnly] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, employee: null });

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    employeeId: '',
    role: 'employee',
    department: '',
    phoneNumber: '',
    isActive: true,
  });

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    active:  0,
    inactive: 0,
    departments: 0,
  });

  useEffect(() => {
    setPageTitle('Employees');
    fetchEmployees();
  }, [setPageTitle]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getAll();
      const employeeList = response.data.data || [];
      setEmployees(employeeList);

      // Calculate stats
      const active = employeeList.filter(e => e.isActive).length;
      const uniqueDepts = [...new Set(employeeList.map(e => e.department))].filter(Boolean).length;
      
      setStats({
        total:  employeeList.length,
        active: active,
        inactive:  employeeList.length - active,
        departments: uniqueDepts,
      });
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingEmployee) {
        // Update employee
        await userAPI.update(editingEmployee._id, formData);
        toast.success('Employee updated successfully!');
      } else {
        // Create new employee
        await userAPI.create(formData);
        toast.success('Employee added successfully!');
      }
      
      setShowModal(false);
      resetForm();
      fetchEmployees();
    } catch (error) {
      console.error('Error saving employee:', error);
      toast.error(error.response?.data?.message || 'Failed to save employee');
    }
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setFormData({
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      password: '', // Don't populate password
      employeeId: employee.employeeId,
      role: employee.role,
      department: employee.department,
      phoneNumber: employee.phoneNumber || '',
      isActive: employee. isActive,
    });
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!deleteConfirm.employee) return;

    try {
      await userAPI.delete(deleteConfirm.employee._id);
      toast.success('Employee deleted successfully!');
      fetchEmployees();
      setDeleteConfirm({ isOpen: false, employee: null });
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast.error('Failed to delete employee');
    }
  };

  const handleApprove = async (employeeId) => {
    try {
      await userAPI.update(employeeId, { isVerified: true });
      toast.success('Employee approved successfully!');
      fetchEmployees();
    } catch (error) {
      console.error('Error approving employee:', error);
      toast.error('Failed to approve employee');
    }
  };

  const handleReject = async (employeeId) => {
    try {
      await userAPI.delete(employeeId);
      toast.success('Employee registration rejected!');
      fetchEmployees();
    } catch (error) {
      console.error('Error rejecting employee:', error);
      toast.error('Failed to reject employee');
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      employeeId: '',
      role:  'employee',
      department:  '',
      phoneNumber: '',
      isActive: true,
    });
    setEditingEmployee(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleExport = () => {
    if (filteredEmployees.length === 0) {
      toast.error('No employees to export');
      return;
    }
    exportEmployeesToExcel(filteredEmployees);
    toast.success('Employees exported successfully! ');
  };

  // Filter employees
  const filteredEmployees = employees.filter((employee) => {
    const matchesSearch = 
      employee.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (employee.employeeId && employee.employeeId.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRole = roleFilter === 'all' || employee.role === roleFilter;
    const matchesDepartment = departmentFilter === 'all' || employee.department === departmentFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && employee.isActive) ||
      (statusFilter === 'inactive' && !employee.isActive) ||
      (statusFilter === 'pending' && !employee.isVerified);
    
    const matchesPending = !pendingOnly || !employee.isVerified;
    
    return matchesSearch && matchesRole && matchesDepartment && matchesStatus && matchesPending;
  });
  
  // Count pending approvals
  const pendingCount = employees.filter(e => !e.isVerified).length;

  // Get unique departments
  const departments = [...new Set(employees.map(e => e.department))].filter(Boolean);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <StatsCardSkeleton key={i} />
          ))}
        </div>
        <TableSkeleton rows={8} columns={7} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Approvals Banner */}
      {pendingCount > 0 && (
        <div className="card bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded-lg">
                <UserPlus className="w-5 h-5 text-yellow-700 dark:text-yellow-400" />
              </div>
              <div>
                <h4 className="font-semibold text-yellow-900 dark:text-yellow-200">
                  Pending Approvals
                </h4>
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  {pendingCount} {pendingCount === 1 ? 'employee' : 'employees'} waiting for approval
                </p>
              </div>
            </div>
            <button
              onClick={() => setPendingOnly(!pendingOnly)}
              className="btn-secondary text-sm"
            >
              {pendingOnly ? 'Show All' : 'View Pending'}
            </button>
          </div>
        </div>
      )}
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg">
              <Users className="w-6 h-6 text-blue-700 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-sm text-gray-600 dark: text-gray-400 mb-1">Total Employees</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
        </div>

        <div className="card hover: shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-green-50 dark:bg-green-900/30 p-3 rounded-lg">
              <Users className="w-6 h-6 text-green-700 dark:text-green-400" />
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Active</p>
          <p className="text-3xl font-bold text-green-600">{stats.active}</p>
        </div>

        <div className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-red-50 dark:bg-red-900/30 p-3 rounded-lg">
              <Users className="w-6 h-6 text-red-700 dark:text-red-400" />
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Inactive</p>
          <p className="text-3xl font-bold text-red-600">{stats.inactive}</p>
        </div>

        <div className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-purple-50 dark:bg-purple-900/30 p-3 rounded-lg">
              <Users className="w-6 h-6 text-purple-700 dark: text-purple-400" />
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Departments</p>
          <p className="text-3xl font-bold text-purple-600">{stats.departments}</p>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="card">
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
          <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search employees..."
                className="pl-10 input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target. value)}
              />
            </div>

            {/* Role Filter */}
            <select
              className="input max-w-xs"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="employee">Employee</option>
            </select>

            {/* Department Filter */}
            <select
              className="input max-w-xs"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target. value)}
            >
              <option value="all">All Departments</option>
              {departments. map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              className="input max-w-xs"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending Approval</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="btn-secondary flex items-center gap-2"
              disabled={filteredEmployees.length === 0}
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Employee
            </button>
          </div>
        </div>
      </div>

      {/* Employees Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark: bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark: text-gray-400 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Employee ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Joined Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No employees found</p>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee) => (
                  <tr key={employee._id} className="hover:bg-gray-50 dark:hover: bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden bg-primary-100 dark:bg-primary-900/30 border-2 border-white dark:border-gray-700 relative">
                          {employee.profilePicture ? (
                            <img
                              src={`${import.meta.env.VITE_API_URL?. replace('/api/v1', '')}${employee.profilePicture}`}
                              alt={`${employee.firstName} ${employee. lastName}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style. display = 'none';
                                const initialsSpan = e.target.parentElement.querySelector('. initials');
                                if (initialsSpan) initialsSpan.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <span 
                            className="initials text-primary-700 dark:text-primary-400 font-semibold text-sm w-full h-full flex items-center justify-center absolute inset-0"
                            style={{ display: employee.profilePicture ? 'none' : 'flex' }}
                          >
                            {employee.firstName?.[0]}{employee.lastName?.[0]}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {employee.firstName} {employee.lastName}
                          </div>
                          <div className="text-sm text-gray-500 dark: text-gray-400">
                            {employee.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {employee.employeeId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark: text-white">
                      {employee.department}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          employee.role === 'admin'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                            : employee.role === 'manager'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {employee. role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            employee.isActive
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          }`}
                        >
                          {employee.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {!employee.isVerified && (
                          <span className="block px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                            Pending Approval
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(employee.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        {!employee.isVerified ? (
                          <>
                            <button
                              onClick={() => handleApprove(employee._id)}
                              className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors flex items-center gap-1"
                              title="Approve"
                            >
                              ✓ Approve
                            </button>
                            <button
                              onClick={() => handleReject(employee._id)}
                              className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors flex items-center gap-1"
                              title="Reject"
                            >
                              ✕ Reject
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEdit(employee)}
                              className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm({ isOpen: true, employee })}
                              className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Employee Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">First Name *</label>
                  <input
                    type="text"
                    required
                    className="input"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e. target.value })}
                  />
                </div>

                <div>
                  <label className="label">Last Name *</label>
                  <input
                    type="text"
                    required
                    className="input"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e. target.value })}
                  />
                </div>

                <div>
                  <label className="label">Email *</label>
                  <input
                    type="email"
                    required
                    className="input"
                    value={formData. email}
                    onChange={(e) => setFormData({ ...formData, email: e.target. value })}
                    disabled={!! editingEmployee}
                  />
                </div>

                <div>
                  <label className="label">Employee ID *</label>
                  <input
                    type="text"
                    required
                    className="input"
                    value={formData. employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  />
                </div>

                {! editingEmployee && (
                  <div>
                    <label className="label">Password *</label>
                    <input
                      type="password"
                      required={!editingEmployee}
                      className="input"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      minLength={8}
                      placeholder="Min.  8 characters"
                    />
                  </div>
                )}

                <div>
                  <label className="label">Phone Number</label>
                  <input
                    type="tel"
                    className="input"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">Department *</label>
                  <input
                    type="text"
                    required
                    className="input"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e. target.value })}
                    placeholder="e.g., IT, HR, Sales"
                  />
                </div>

                <div>
                  <label className="label">Role *</label>
                  <select
                    required
                    className="input"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="label">Status *</label>
                  <select
                    required
                    className="input"
                    value={formData. isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })}
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                >
                  {editingEmployee ?  'Update Employee' : 'Add Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, employee: null })}
        onConfirm={handleDelete}
        title="Delete Employee"
        message={`Are you sure you want to delete ${deleteConfirm.employee?.firstName} ${deleteConfirm.employee?.lastName}?  This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
};

export default Employees;