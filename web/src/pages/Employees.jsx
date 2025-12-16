import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Users, Plus, Search, Edit2, Trash2, Mail, Phone, 
  Filter, Download, X, Check 
} from 'lucide-react';
import { usersAPI } from '../services/api';

const Employees = () => {
  const { setPageTitle } = useOutletContext();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  useEffect(() => {
    setPageTitle('Employees');
    fetchEmployees();
  }, [setPageTitle]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await usersAPI.getAll();
      setEmployees(response.data. data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      // Mock data for development
      setEmployees([
        {
          _id: '1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example. com',
          employeeId: 'EMP001',
          role: 'admin',
          department: 'IT',
          phoneNumber: '+1234567890',
          isActive: true,
        },
        {
          _id: '2',
          firstName:  'Jane',
          lastName:  'Smith',
          email:  'jane@example.com',
          employeeId: 'EMP002',
          role:  'staff',
          department: 'HR',
          phoneNumber: '+1234567891',
          isActive: true,
        },
        {
          _id: '3',
          firstName: 'Mike',
          lastName: 'Johnson',
          email: 'mike@example.com',
          employeeId: 'EMP003',
          role: 'manager',
          department: 'Sales',
          phoneNumber: '+1234567892',
          isActive: false,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (! window.confirm('Are you sure you want to delete this employee?')) return;
    
    try {
      await usersAPI.delete(id);
      fetchEmployees();
    } catch (error) {
      console.error('Error deleting employee:', error);
      alert('Failed to delete employee');
    }
  };

  const handleEdit = (employee) => {
    setSelectedEmployee(employee);
    setShowAddModal(true);
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch = 
      emp.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email. toLowerCase().includes(searchTerm. toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = filterRole === 'all' || emp.role === filterRole;
    
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role) => {
    const colors = {
      admin: 'bg-red-100 text-red-800',
      manager: 'bg-blue-100 text-blue-800',
      staff: 'bg-gray-100 text-gray-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
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
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex-1 flex gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
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
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="staff">Staff</option>
          </select>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button className="btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button 
            className="btn-primary flex items-center gap-2"
            onClick={() => {
              setSelectedEmployee(null);
              setShowAddModal(true);
            }}
          >
            <Plus className="w-4 h-4" />
            Add Employee
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-sm text-gray-600">Total Employees</p>
          <p className="text-2xl font-bold text-gray-900">{employees.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Active</p>
          <p className="text-2xl font-bold text-green-600">
            {employees.filter(e => e.isActive).length}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Inactive</p>
          <p className="text-2xl font-bold text-red-600">
            {employees.filter(e => !e.isActive).length}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Admins</p>
          <p className="text-2xl font-bold text-blue-600">
            {employees.filter(e => e.role === 'admin').length}
          </p>
        </div>
      </div>

      {/* Employees Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    No employees found
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee) => (
                  <tr key={employee._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-primary-700 font-semibold text-sm">
                            {employee.firstName[0]}{employee.lastName[0]}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {employee.firstName} {employee.lastName}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {employee.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-mono text-gray-900">
                        {employee.employeeId}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{employee.department}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadge(employee.role)}`}>
                        {employee.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        employee.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {employee.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(employee)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(employee._id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
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

      {/* Add/Edit Modal */}
      {showAddModal && (
        <EmployeeModal
          employee={selectedEmployee}
          onClose={() => {
            setShowAddModal(false);
            setSelectedEmployee(null);
          }}
          onSave={() => {
            fetchEmployees();
            setShowAddModal(false);
            setSelectedEmployee(null);
          }}
        />
      )}
    </div>
  );
};

// Employee Modal Component
const EmployeeModal = ({ employee, onClose, onSave }) => {
  const [formData, setFormData] = useState(employee || {
    firstName: '',
    lastName: '',
    email: '',
    employeeId:  '',
    role: 'staff',
    department: '',
    phoneNumber: '',
    password: '',
    isActive: true,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (employee) {
        await usersAPI. update(employee._id, formData);
      } else {
        await usersAPI.create(formData);
      }
      onSave();
    } catch (error) {
      console.error('Error saving employee:', error);
      alert('Failed to save employee');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
          <h3 className="text-xl font-bold text-gray-900">
            {employee ? 'Edit Employee' : 'Add New Employee'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
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
                onChange={(e) => setFormData({ ... formData, lastName: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="label">Email *</label>
            <input
              type="email"
              required
              className="input"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Employee ID *</label>
              <input
                type="text"
                required
                className="input"
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Phone Number</label>
              <input
                type="tel"
                className="input"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ... formData, phoneNumber: e. target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Role *</label>
              <select
                required
                className="input"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <option value="staff">Staff</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="label">Department *</label>
              <input
                type="text"
                required
                className="input"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </div>
          </div>

          {! employee && (
            <div>
              <label className="label">Password *</label>
              <input
                type="password"
                required={! employee}
                className="input"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                minLength="8"
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">
              Active Employee
            </label>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
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
              disabled={loading}
            >
              {loading ? 'Saving...' : employee ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Employees;