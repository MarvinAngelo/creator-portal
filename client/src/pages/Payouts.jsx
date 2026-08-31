import { useState, useEffect } from 'react';
import { api } from '../api';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

export default function Payouts({ creatorId }) {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectReason, setRejectReason] = useState({});

  const load = () => {
    api.getPayouts(creatorId).then(setPayouts).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async (payoutId) => {
    setActionLoading(payoutId);
    try {
      await api.approvePayout(creatorId, payoutId);
      load();
    } catch (err) {
      alert(err.error || 'Failed to approve');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (payoutId) => {
    setActionLoading(payoutId);
    try {
      await api.rejectPayout(creatorId, payoutId, rejectReason[payoutId] || '');
      setRejectReason((prev) => ({ ...prev, [payoutId]: '' }));
      load();
    } catch (err) {
      alert(err.error || 'Failed to reject');
    } finally {
      setActionLoading(null);
    }
  };

  const formatCents = (cents) => `$${(cents / 100).toFixed(2)}`;
  const formatDate = (d) => new Date(d + 'Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (loading) return <p className="text-slate-400">Loading payouts...</p>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Payout Requests</h2>

      {payouts.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-sm">
          <p className="text-slate-400">No payout requests yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {payouts.map((p) => (
            <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-slate-800">Payout #{p.id}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status]}`}>
                      {p.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">Requested: {formatDate(p.created_at)}</p>
                  {p.reviewed_at && (
                    <p className="text-sm text-slate-500">Reviewed: {formatDate(p.reviewed_at)}</p>
                  )}
                  {p.rejection_reason && (
                    <p className="text-sm text-red-600 mt-1">Reason: {p.rejection_reason}</p>
                  )}
                </div>
                <p className="text-2xl font-bold text-slate-900">{formatCents(p.amount)}</p>
              </div>

              {p.status === 'pending' && (
                <div className="mt-4 pt-4 border-t border-slate-100 flex gap-3 items-end">
                  <button
                    onClick={() => handleApprove(p.id)}
                    disabled={actionLoading === p.id}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {actionLoading === p.id ? 'Processing...' : 'Approve'}
                  </button>
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Rejection reason (optional)"
                      value={rejectReason[p.id] || ''}
                      onChange={(e) => setRejectReason((prev) => ({ ...prev, [p.id]: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                    />
                  </div>
                  <button
                    onClick={() => handleReject(p.id)}
                    disabled={actionLoading === p.id}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
