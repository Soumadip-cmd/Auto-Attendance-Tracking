import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  RefreshCw,
  ShieldCheck,
  XCircle
} from 'lucide-react';
import { movementPermissionAPI } from '../services/api';

const statusClassName = (status) => {
  if (status === 'approved') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
  if (status === 'rejected') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
  if (status === 'cancelled' || status === 'expired') return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
};

const teacherName = (request) => {
  const teacher = request.teacher;
  if (!teacher) return 'Unknown teacher';
  return `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() || teacher.email;
};

const formatDateTime = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleString();
};

export default function MovementPermissions() {
  const { setPageTitle } = useOutletContext();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [radius, setRadius] = useState(100);
  const [endTime, setEndTime] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const stats = useMemo(() => ({
    pending: requests.filter((request) => request.status === 'pending').length,
    approved: requests.filter((request) => request.status === 'approved').length,
    rejected: requests.filter((request) => request.status === 'rejected').length,
    total: requests.length,
  }), [requests]);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const params = statusFilter === 'all' ? {} : { status: statusFilter };
      const response = await movementPermissionAPI.getAll(params);
      if (response.data.success) {
        setRequests(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load movement permissions:', error);
      toast.error(error.response?.data?.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    setPageTitle('Movement Permissions');
    fetchRequests();
  }, [fetchRequests, setPageTitle]);

  const selectRequest = (request) => {
    setSelectedRequest(request);
    setDecisionNotes(request.decisionNotes || '');
    setRadius(request.radius || 100);
    setEndTime(request.endTime ? new Date(request.endTime).toISOString().slice(0, 16) : '');
  };

  const approveRequest = async () => {
    if (!selectedRequest) return;

    try {
      setSubmitting(true);
      await movementPermissionAPI.approve(selectedRequest._id, {
        radius: Number(radius),
        endTime: endTime ? new Date(endTime).toISOString() : undefined,
        decisionNotes,
      });
      toast.success('Movement permission approved');
      setSelectedRequest(null);
      await fetchRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Approval failed');
    } finally {
      setSubmitting(false);
    }
  };

  const rejectRequest = async () => {
    if (!selectedRequest) return;

    try {
      setSubmitting(true);
      await movementPermissionAPI.reject(selectedRequest._id, { decisionNotes });
      toast.success('Movement permission rejected');
      setSelectedRequest(null);
      await fetchRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Rejection failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
          <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500 dark:text-gray-400">Approved</p>
          <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500 dark:text-gray-400">Rejected</p>
          <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 card">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-primary-600" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Requests</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Temporary location access</p>
              </div>
            </div>
            <div className="flex gap-2">
              <select
                className="input max-w-[180px]"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="all">All</option>
              </select>
              <button onClick={fetchRequests} className="btn-secondary flex items-center gap-2" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Refresh
              </button>
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
                    <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                      Loading requests
                    </td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                      No movement requests found.
                    </td>
                  </tr>
                ) : requests.map((request) => (
                  <tr
                    key={request._id}
                    onClick={() => selectRequest(request)}
                    className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                      selectedRequest?._id === request._id ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                    }`}
                  >
                    <td className="px-4 py-4">
                      <p className="font-medium text-gray-900 dark:text-white">{teacherName(request)}</p>
                      <p className="text-sm text-gray-500">{request.teacher?.employeeId || request.teacher?.email}</p>
                    </td>
                    <td className="px-4 py-4 max-w-xs">
                      <p className="text-sm text-gray-900 dark:text-white line-clamp-2">{request.reason}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-gray-900 dark:text-white">{formatDateTime(request.startTime)}</p>
                      <p className="text-sm text-gray-500">{formatDateTime(request.endTime)}</p>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">{request.radius}m</td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusClassName(request.status)}`}>
                        {request.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          {selectedRequest ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{teacherName(selectedRequest)}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{selectedRequest.teacher?.department || 'Department not set'}</p>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex gap-2">
                  <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-gray-900 dark:text-white">{formatDateTime(selectedRequest.startTime)}</p>
                    <p className="text-gray-500">{formatDateTime(selectedRequest.endTime)}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                  <p className="text-gray-700 dark:text-gray-300">
                    {selectedRequest.allowedLocation?.coordinates?.[1]}, {selectedRequest.allowedLocation?.coordinates?.[0]}
                  </p>
                </div>
              </div>

              <div>
                <label className="label">Approved radius</label>
                <input
                  type="number"
                  min="10"
                  max="10000"
                  className="input"
                  value={radius}
                  onChange={(event) => setRadius(event.target.value)}
                />
              </div>

              <div>
                <label className="label">Access until</label>
                <input
                  type="datetime-local"
                  className="input"
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                />
              </div>

              <div>
                <label className="label">Decision notes</label>
                <textarea
                  className="input"
                  rows="4"
                  value={decisionNotes}
                  onChange={(event) => setDecisionNotes(event.target.value)}
                  placeholder="Optional note for teacher"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={approveRequest}
                  disabled={submitting || selectedRequest.status !== 'pending'}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Approve
                </button>
                <button
                  onClick={rejectRequest}
                  disabled={submitting || selectedRequest.status !== 'pending'}
                  className="btn-secondary flex-1 flex items-center justify-center gap-2 text-red-600"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <ShieldCheck className="w-10 h-10 mx-auto mb-3 opacity-60" />
              <p>Select a request to review.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
