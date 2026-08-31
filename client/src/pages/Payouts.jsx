import { useState, useEffect } from 'react';
import { api } from '../api';
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, ClockIcon } from '../components/Icons';

const STATUS_CONFIG = {
  pending: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: ClockIcon,
    label: 'Pending',
    cardBorder: 'border-l-amber-400',
  },
  approved: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: CheckCircleIcon,
    label: 'Approved',
    cardBorder: 'border-l-emerald-400',
  },
  rejected: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    icon: XCircleIcon,
    label: 'Rejected',
    cardBorder: 'border-l-red-400',
  },
};

export default function Payouts({ creatorId }) {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectReason, setRejectReason] = useState({});
  const [error, setError] = useState(null);

  const load = () => {
    api.getPayouts(creatorId).then(setPayouts).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async (payoutId) => {
    setActionLoading(payoutId);
    setError(null);
    try {
      await api.approvePayout(creatorId, payoutId);
      load();
    } catch (err) {
      setError(err.error || 'Failed to approve');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (payoutId) => {
    setActionLoading(payoutId);
    setError(null);
    try {
      await api.rejectPayout(creatorId, payoutId, rejectReason[payoutId] || '');
      setRejectReason((prev) => ({ ...prev, [payoutId]: '' }));
      load();
    } catch (err) {
      setError(err.error || 'Failed to reject');
    } finally {
      setActionLoading(null);
    }
  };

  const formatCents = (cents) => `$${(cents / 100).toFixed(2)}`;
  const formatDate = (d) => new Date(d + 'Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="bg-white rounded-2xl h-10 w-48" />
        <div className="bg-white rounded-2xl h-32" />
        <div className="bg-white rounded-2xl h-32" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Payout Requests</h2>
        <span className="text-xs font-medium text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full">
          {payouts.length} total
        </span>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 bg-red-50 text-red-700 border border-red-200">
          <ExclamationTriangleIcon className="w-5 h-5 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {payouts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/60 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
            </svg>
          </div>
          <p className="text-slate-500 font-medium">No payout requests yet</p>
          <p className="text-slate-400 text-sm mt-1">Request a payout from your wallet to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {payouts.map((p) => {
            const config = STATUS_CONFIG[p.status] || STATUS_CONFIG.pending;
            const StatusIcon = config.icon;
            return (
              <div
                key={p.id}
                className={`bg-white rounded-2xl border border-slate-200/60 border-l-4 ${config.cardBorder} p-5 shadow-sm hover:shadow-md transition-shadow duration-200`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${config.bg}`}>
                      <StatusIcon className={`w-6 h-6 ${config.text}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-slate-800">Payout #{p.id}</h3>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text} ${config.border} border`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {config.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1.5 text-sm text-slate-500">
                        <span>Requested: {formatDate(p.created_at)}</span>
                        {p.reviewed_at && <span>Reviewed: {formatDate(p.reviewed_at)}</span>}
                      </div>
                      {p.rejection_reason && (
                        <div className="mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                          <span className="font-medium">Reason:</span> {p.rejection_reason}
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{formatCents(p.amount)}</p>
                </div>

                {p.status === 'pending' && (
                  <div className="mt-4 pt-4 border-t border-slate-100 flex gap-3 items-end">
                    <button
                      onClick={() => handleApprove(p.id)}
                      disabled={actionLoading === p.id}
                      className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      <CheckCircleIcon className="w-4 h-4" />
                      {actionLoading === p.id ? 'Processing...' : 'Approve'}
                    </button>
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Rejection reason (optional)"
                        value={rejectReason[p.id] || ''}
                        onChange={(e) => setRejectReason((prev) => ({ ...prev, [p.id]: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                      />
                    </div>
                    <button
                      onClick={() => handleReject(p.id)}
                      disabled={actionLoading === p.id}
                      className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      <XCircleIcon className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
