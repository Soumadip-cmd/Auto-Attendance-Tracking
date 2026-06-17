import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  Building2,
  Plus,
  Pencil,
  Users,
  X,
  Loader2,
  Search,
  UserPlus,
  UserMinus,
  ChevronRight,
} from 'lucide-react';
import { organizationAPI, userAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const canManage = (user) =>
  ['super_admin', 'admin', 'manager'].includes(user?.role);

const canManageTeachers = (user) =>
  ['super_admin', 'admin', 'manager', 'hod'].includes(user?.role);

function CollegeModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', code: '', address: '' });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      toast.error('Name and code are required');
      return;
    }
    setSaving(true);
    try {
      await organizationAPI.createCollege(form);
      toast.success('College created');
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create college');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create College</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 rounded-lg p-3">
          No college found. Create your institution first before adding departments.
        </p>
        <div className="space-y-3">
          <div>
            <label className="label">College Name *</label>
            <input className="input" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. ABC Engineering College" />
          </div>
          <div>
            <label className="label">Code *</label>
            <input className="input uppercase" value={form.code} onChange={(e) => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="e.g. ABCEC" />
          </div>
          <div>
            <label className="label">Address</label>
            <input className="input" value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} placeholder="City, State" />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Create College
          </button>
        </div>
      </div>
    </div>
  );
}

function DeptModal({ dept, colleges, users, onClose, onSave }) {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const [form, setForm] = useState({
    college: dept?.college?._id || dept?.college || (colleges[0]?._id ?? ''),
    name: dept?.name || '',
    code: dept?.code || '',
    description: dept?.description || '',
    hod: dept?.hod?._id || dept?.hod || '',
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      toast.error('Name and code are required');
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const adminUsers = users.filter((u) =>
    ['super_admin', 'admin', 'hod', 'manager', 'teacher'].includes(u.role)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {dept ? 'Edit Department' : 'New Department'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuperAdmin && colleges.length > 0 && (
          <div>
            <label className="label">College</label>
            <select
              className="input"
              value={form.college}
              onChange={(e) => setForm((f) => ({ ...f, college: e.target.value }))}
            >
              {colleges.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label">Department Name *</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Computer Science"
            />
          </div>
          <div>
            <label className="label">Code *</label>
            <input
              className="input uppercase"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              placeholder="e.g. CS"
            />
          </div>
          <div>
            <label className="label">HOD (Head of Department)</label>
            <select
              className="input"
              value={form.hod}
              onChange={(e) => setForm((f) => ({ ...f, hod: e.target.value }))}
            >
              <option value="">— None —</option>
              {adminUsers.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.firstName} {u.lastName} ({u.role})
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="label">Description</label>
            <textarea
              className="input"
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Optional description"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {dept ? 'Save Changes' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

function TeacherPanel({ dept, onClose }) {
  const [deptTeachers, setDeptTeachers] = useState([]);
  const [allTeachers, setAllTeachers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [deptRes, allRes] = await Promise.all([
        organizationAPI.getDepartmentTeachers(dept._id),
        userAPI.getAll({ role: 'teacher', limit: 500 }),
      ]);
      // Web API interceptor returns full axios response, so .data is the JSON body
      setDeptTeachers(deptRes.data?.data || []);
      setAllTeachers(allRes.data?.data || allRes.data?.users || []);
    } catch {
      toast.error('Failed to load teachers');
    } finally {
      setLoading(false);
    }
  }, [dept._id]);

  useEffect(() => { loadData(); }, [loadData]);

  const deptIds = new Set(deptTeachers.map((t) => t._id));

  const available = allTeachers.filter(
    (t) =>
      !deptIds.has(t._id) &&
      (search === '' ||
        `${t.firstName} ${t.lastName} ${t.email} ${t.employeeId || ''}`
          .toLowerCase()
          .includes(search.toLowerCase()))
  );

  const assign = async (teacherId, action) => {
    setAssigning(teacherId);
    try {
      await organizationAPI.assignTeacher(dept._id, teacherId, action);
      toast.success(action === 'assign' ? 'Teacher added' : 'Teacher removed');
      await loadData();
    } catch {
      toast.error('Action failed');
    } finally {
      setAssigning(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-md bg-white dark:bg-gray-800 h-full shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">{dept.name} — Teachers</h2>
            <p className="text-sm text-gray-500">{deptTeachers.length} assigned</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Current teachers */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Current Teachers</h3>
              {deptTeachers.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">No teachers assigned yet</p>
              ) : (
                <ul className="space-y-2">
                  {deptTeachers.map((t) => (
                    <li key={t._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div>
                        <p className="font-medium text-sm text-gray-900 dark:text-white">
                          {t.firstName} {t.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{t.employeeId || t.email}</p>
                      </div>
                      <button
                        onClick={() => assign(t._id, 'remove')}
                        disabled={assigning === t._id}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Remove from department"
                      >
                        {assigning === t._id
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <UserMinus className="w-4 h-4" />}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Add teachers */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Add Teacher</h3>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  className="input pl-9 py-2 text-sm"
                  placeholder="Search by name / email / ID"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              {available.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-3">No other teachers found</p>
              ) : (
                <ul className="space-y-2 max-h-64 overflow-y-auto">
                  {available.map((t) => (
                    <li key={t._id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                      <div>
                        <p className="font-medium text-sm text-gray-900 dark:text-white">
                          {t.firstName} {t.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{t.employeeId || t.email}</p>
                      </div>
                      <button
                        onClick={() => assign(t._id, 'assign')}
                        disabled={assigning === t._id}
                        className="text-primary-600 hover:text-primary-800 p-1"
                        title="Add to department"
                      >
                        {assigning === t._id
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <UserPlus className="w-4 h-4" />}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Departments() {
  const { setPageTitle } = useOutletContext();
  const { user } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | { dept: null|{...} }
  const [teacherPanel, setTeacherPanel] = useState(null); // null | dept
  const [collegeModal, setCollegeModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [deptRes, userRes] = await Promise.all([
        organizationAPI.getDepartments(),
        userAPI.getAll({ limit: 500 }),
      ]);
      setDepartments(deptRes.data?.data || []);
      setAllUsers(userRes.data?.data || []);

      if (['super_admin', 'admin'].includes(user?.role)) {
        const colRes = await organizationAPI.getColleges();
        setColleges(colRes.data?.data || []);
      }
    } catch {
      toast.error('Failed to load departments');
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    setPageTitle('Departments');
    load();
  }, [load, setPageTitle]);

  const saveDept = async (form) => {
    try {
      if (modal.dept) {
        await organizationAPI.updateDepartment(modal.dept._id, form);
        toast.success('Department updated');
      } else {
        await organizationAPI.createDepartment(form);
        toast.success('Department created');
      }
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
      throw err;
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="w-6 h-6 text-primary-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Departments</h1>
            <p className="text-sm text-gray-500">{departments.length} departments</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canManage(user) && colleges.length === 0 && (
            <button
              onClick={() => setCollegeModal(true)}
              className="btn-secondary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Create College First
            </button>
          )}
          {canManage(user) && (
            <button
              onClick={() => {
                if (colleges.length === 0) {
                  setCollegeModal(true);
                  toast('Create a college first before adding departments.', { icon: '🏫' });
                } else {
                  setModal({ dept: null });
                }
              }}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> New Department
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="card overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
          </div>
        ) : departments.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Building2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No departments yet.</p>
            {canManage(user) && (
              <button onClick={() => setModal({ dept: null })} className="mt-3 btn-primary">
                Create first department
              </button>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">College</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">HOD</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {departments.map((d) => (
                <tr key={d._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                  <td className="px-4 py-4">
                    <p className="font-semibold text-gray-900 dark:text-white">{d.name}</p>
                    <p className="text-xs text-gray-500 font-mono">{d.code}</p>
                    {d.description && (
                      <p className="text-xs text-gray-400 mt-0.5 max-w-xs truncate">{d.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                    {d.college?.name || '—'}
                  </td>
                  <td className="px-4 py-4">
                    {d.hod ? (
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {d.hod.firstName} {d.hod.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{d.hod.email}</p>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">Not assigned</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      d.isActive
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      {d.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      {canManageTeachers(user) && (
                        <button
                          onClick={() => setTeacherPanel(d)}
                          className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-800 font-medium"
                        >
                          <Users className="w-4 h-4" /> Teachers
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                      {canManage(user) && (
                        <button
                          onClick={() => setModal({ dept: d })}
                          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <DeptModal
          dept={modal.dept}
          colleges={colleges}
          users={allUsers}
          onClose={() => setModal(null)}
          onSave={saveDept}
        />
      )}

      {teacherPanel && (
        <TeacherPanel dept={teacherPanel} onClose={() => setTeacherPanel(null)} />
      )}

      {collegeModal && (
        <CollegeModal
          onClose={() => setCollegeModal(false)}
          onCreated={load}
        />
      )}
    </div>
  );
}
