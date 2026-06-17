import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  ShieldCheck,
  X,
  XCircle,
} from 'lucide-react';
import { movementPermissionAPI, userAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const statusCls = (status) => {
  if (status === 'approved') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
  if (status === 'rejected') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
  if (status === 'cancelled' || status === 'expired') return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
};

const teacherName = (r) => {
  const t = r.teacher;
  if (!t) return 'Unknown';
  return `${t.firstName || ''} ${t.lastName || ''}`.trim() || t.email;
};

const fmt = (v) => v ? new Date(v).toLocaleString() : '—';

const toLocal = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 16);
};

const canDecide = (user) =>
  ['super_admin', 'admin', 'manager', 'hod'].includes(user?.role);

// ── Grant Permission Modal (HOD / Admin creates directly) ─────────────────────
function GrantModal({ onClose, onSaved }) {
  const [teachers, setTeachers] = useState([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [form, setForm] = useState({
    teacher: '',
    reason: '',
    latitude: '',
    longitude: '',
    radius: 100,
    startTime: '',
    endTime: '',
    decisionNotes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    userAPI.getAll({ role: 'teacher', limit: 500 })
      .then((r) => setTeachers(r.data?.data || []))
      .catch(() => toast.error('Failed to load teachers'))
      .finally(() => setLoadingTeachers(false));
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.teacher) { toast.error('Select a teacher'); return; }
    if (!form.reason.trim()) { toast.error('Reason is required'); return; }
    const lat = parseFloat(form.latitude);
    const lng = parseFloat(form.longitude);
    if (isNaN(lat) || isNaN(lng)) { toast.error('Enter valid latitude and longitude'); return; }
    if (!form.startTime) { toast.error('Start time is required'); return; }
    if (!form.endTime) { toast.error('End time is required'); return; }
    if (new Date(form.endTime) <= new Date(form.startTime)) {
      toast.error('End time must be after start time'); return;
    }
    setSaving(true);
    try {
      await movementPermissionAPI.create({
        teacher: form.teacher,
        reason: form.reason,
        latitude: lat,
        longitude: lng,
        radius: Number(form.radius),
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
        decisionNotes: form.decisionNotes,
      });
      toast.success('Permission granted successfully');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to grant permission');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Grant Movement Permission</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div>
          <label className="label">Teacher *</label>
          {loadingTeachers ? (
            <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
          ) : (
            <select className="input" value={form.teacher} onChange={(e) => set('teacher', e.target.value)}>
              <option value="">— Select teacher —</option>
              {teachers.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.firstName} {t.lastName} ({t.employeeId || t.email})
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="label">Reason *</label>
          <textarea
            className="input"
            rows={2}
            value={form.reason}
            onChange={(e) => set('reason', e.target.value)}
            placeholder="e.g. Urgent fieldwork, hospital visit"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Latitude *</label>
            <input
              className="input"
              type="number"
              step="any"
              value={form.latitude}
              onChange={(e) => set('latitude', e.target.value)}
              placeholder="e.g. 28.6139"
            />
          </div>
          <div>
            <label className="label">Longitude *</label>
            <input
              className="input"
              type="number"
              step="any"
              value={form.longitude}
              onChange={(e) => set('longitude', e.target.value)}
              placeholder="e.g. 77.2090"
            />
          </div>
        </div>

        <div>
          <label className="label">Allowed Radius (meters)</label>
          <input
            className="input"
            type="number"
            min="10"
            max="10000"
            value={form.radius}
            onChange={(e) => set('radius', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Start Time *</label>
            <input
              className="input"
              type="datetime-local"
              value={form.startTime}
              onChange={(e) => set('startTime', e.target.value)}
            />
          </div>
          <div>
            <label className="label">End Time *</label>
            <input
              className="input"
              type="datetime-local"
              value={form.endTime}
              onChange={(e) => set('endTime', e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="label">Notes (optional)</label>
          <input
            className="input"
            value={form.decisionNotes}
            onChange={(e) => set('decisionNotes', e.target.value)}
            placeholder="Any additional notes for the teacher"
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Grant Permission
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MovementPermissions() {
  const { setPageTitle } = useOutletContext();
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selected, setSelected] = useState(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [radius, setRadius] = useState(100);
  const [endTime, setEndTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showGrant, setShowGrant] = useState(false);

  const stats = useMemo(() => ({
    pending: requests.filter((r) => r.status === 'pending').length,
    approved: requests.filter((r) => r.status === 'approved').length,
    rejected: requests.filter((r) => r.status === 'rejected').length,
    total: requests.length,
  }), [requests]);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const params = statusFilter === 'all' ? {} : { status: statusFilter };
      const res = await movementPermissionAPI.getAll(params);
      if (res.data.success) setRequests(res.data.data);
    } catch {
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    setPageTitle('Movement Permissions');
    fetch();
  }, [fetch, setPageTitle]);

  const select = (r) => {
    setSelected(r);
    setDecisionNotes(r.decisionNotes || '');
    setRadius(r.radius || 100);
    setEndTime(toLocal(r.endTime));
  };

  const approve = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await movementPermissionAPI.approve(selected._id, {
        radius: Number(radius),
        endTime: endTime ? new Date(endTime).toISOString() : undefined,
        decisionNotes,
      });
      toast.success('Permission approved');
      setSelected(null);
      fetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Approval failed');
    } finally {
      setSubmitting(false);
    }
  };

  const reject = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await movementPermissionAPI.reject(selected._id, { decisionNotes });
      toast.success('Permission rejected');
      setSelected(null);
      fetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Rejection failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Pending', value: stats.pending, color: 'text-amber-600' },
          { label: 'Approved', value: stats.approved, color: 'text-green-600' },
          { label: 'Rejected', value: stats.rejected, color: 'text-red-600' },
          { label: 'Total', value: stats.total, color: 'text-gray-900 dark:text-white' },
        ].map((s) => (
          <div key={s.label} className="card">
            <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Request list */}
        <div className="xl:col-span-2 card">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-primary-600" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Requests</h2>
                <p className="text-sm text-gray-500">Teacher movement permissions</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <select
                className="input max-w-[160px]"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="all">All</option>
              </select>
              <button onClick={fetch} className="btn-secondary flex items-center gap-2" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Refresh
              </button>
              {canDecide(user) && (
                <button
                  onClick={() => setShowGrant(true)}
                  className="btn-primary flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Grant
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teacher</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Window</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Radius</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-10 text-center">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary-600" />
                    </td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-10 text-center text-gray-500">
                      No movement requests found.
                    </td>
                  </tr>
                ) : requests.map((r) => (
                  <tr
                    key={r._id}
                    onClick={() => select(r)}
                    className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                      selected?._id === r._id ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                    }`}
                  >
                    <td className="px-4 py-4">
                      <p className="font-medium text-gray-900 dark:text-white">{teacherName(r)}</p>
                      <p className="text-xs text-gray-500">{r.teacher?.department || r.teacher?.email}</p>
                    </td>
                    <td className="px-4 py-4 max-w-[180px]">
                      <p className="text-sm text-gray-900 dark:text-white line-clamp-2">{r.reason}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-xs text-gray-900 dark:text-white">{fmt(r.startTime)}</p>
                      <p className="text-xs text-gray-500">{fmt(r.endTime)}</p>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">{r.radius}m</td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusCls(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail / Approve panel */}
        <div className="card">
          {selected ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{teacherName(selected)}</h2>
                  <p className="text-sm text-gray-500">{selected.teacher?.department || '—'}</p>
                </div>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300">
                <p className="font-medium text-gray-900 dark:text-white mb-1">Reason</p>
                {selected.reason}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex gap-2">
                  <Clock className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-gray-500 text-xs">From</p>
                    <p className="text-gray-900 dark:text-white">{fmt(selected.startTime)}</p>
                    <p className="text-gray-500 text-xs mt-1">Until</p>
                    <p className="text-gray-900 dark:text-white">{fmt(selected.endTime)}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-gray-500 text-xs">Requested location</p>
                    <p className="text-gray-900 dark:text-white font-mono text-xs">
                      {selected.allowedLocation?.coordinates?.[1] ?? '—'},{' '}
                      {selected.allowedLocation?.coordinates?.[0] ?? '—'}
                    </p>
                  </div>
                </div>
              </div>

              {selected.status === 'pending' && canDecide(user) && (
                <>
                  <div>
                    <label className="label">Approved radius (m)</label>
                    <input
                      type="number" min="10" max="10000"
                      className="input"
                      value={radius}
                      onChange={(e) => setRadius(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">Access until</label>
                    <input
                      type="datetime-local"
                      className="input"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">Decision notes</label>
                    <textarea
                      className="input"
                      rows={3}
                      value={decisionNotes}
                      onChange={(e) => setDecisionNotes(e.target.value)}
                      placeholder="Optional note for teacher"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={approve}
                      disabled={submitting}
                      className="btn-primary flex-1 flex items-center justify-center gap-2"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Approve
                    </button>
                    <button
                      onClick={reject}
                      disabled={submitting}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium"
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                  </div>
                </>
              )}

              {selected.status !== 'pending' && (
                <div className={`p-3 rounded-lg text-sm ${statusCls(selected.status)}`}>
                  <p className="font-semibold capitalize">{selected.status}</p>
                  {selected.decisionNotes && (
                    <p className="mt-1 opacity-80">{selected.decisionNotes}</p>
                  )}
                  {selected.approvedBy && (
                    <p className="mt-1 opacity-70 text-xs">
                      by {selected.approvedBy.firstName} {selected.approvedBy.lastName}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-14 text-gray-500 dark:text-gray-400">
              <ShieldCheck className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Select a request to review</p>
              {canDecide(user) && (
                <button
                  onClick={() => setShowGrant(true)}
                  className="mt-4 btn-primary flex items-center gap-2 mx-auto"
                >
                  <Plus className="w-4 h-4" /> Grant Permission Directly
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {showGrant && (
        <GrantModal
          onClose={() => setShowGrant(false)}
          onSaved={fetch}
        />
      )}
    </div>
  );
}
