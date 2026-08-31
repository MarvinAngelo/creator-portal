import { useState, useEffect } from 'react';
import { api } from '../api';
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, ClockIcon } from '../components/Icons';

const STATUS_CONFIG = {
  pending: {
    bg: 'rgba(255, 216, 77, 0.1)',
    text: 'var(--c3)',
    border: 'rgba(255, 216, 77, 0.2)',
    icon: ClockIcon,
    label: 'Pending',
    cardBorder: 'var(--c3)',
  },
  approved: {
    bg: 'rgba(88, 224, 140, 0.1)',
    text: 'var(--c2)',
    border: 'rgba(88, 224, 140, 0.2)',
    icon: CheckCircleIcon,
    label: 'Approved',
    cardBorder: 'var(--c2)',
  },
  rejected: {
    bg: 'rgba(255, 92, 79, 0.1)',
    text: 'var(--c5)',
    border: 'rgba(255, 92, 79, 0.2)',
    icon: XCircleIcon,
    label: 'Rejected',
    cardBorder: 'var(--c5)',
  },
};

export default function Payouts({ creatorId }) {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectReason, setRejectReason] = useState({});
  const [error, setError] = useState(null);
  const [expandedReasons, setExpandedReasons] = useState(new Set());

  const load = () => {
    api.getPayouts(creatorId).then(setPayouts).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggleReason = (payoutId) => {
    setExpandedReasons(prev => {
      const next = new Set(prev);
      if (next.has(payoutId)) {
        next.delete(payoutId);
      } else {
        next.add(payoutId);
      }
      return next;
    });
  };

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
        <div className="kv-card h-10 w-48" />
        <div className="kv-card h-32" />
        <div className="kv-card h-32" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--ink)' }}>Payout Requests</h2>
        <span className="text-xs font-medium px-3 py-1.5 rounded-full" style={{ color: 'var(--ink-faint)', background: 'var(--surface)', fontFamily: 'var(--font-mono)' }}>
          {payouts.length} total
        </span>
      </div>

      {/* Error Banner */}
      {error && (
        <div
          className="px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2"
          style={{
            background: 'rgba(255, 92, 79, 0.1)',
            color: 'var(--c5)',
            border: '1px solid rgba(255, 92, 79, 0.2)',
          }}
        >
          <ExclamationTriangleIcon className="w-5 h-5 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {payouts.length === 0 ? (
        <div className="kv-card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--surface)' }}>
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ color: 'var(--ink-faint)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
            </svg>
          </div>
          <p className="font-medium" style={{ color: 'var(--ink-dim)' }}>No payout requests yet</p>
          <p className="text-sm mt-1" style={{ color: 'var(--ink-faint)' }}>Request a payout from your wallet to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {payouts.map((p) => {
            const config = STATUS_CONFIG[p.status] || STATUS_CONFIG.pending;
            const StatusIcon = config.icon;
            const isExpanded = expandedReasons.has(p.id);
            return (
              <div
                key={p.id}
                className="kv-card p-5"
                style={{ borderLeft: `4px solid ${config.cardBorder}` }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: config.bg }}>
                      <StatusIcon className="w-6 h-6" style={{ color: config.text }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>Payout #{p.id}</h3>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ background: config.bg, color: config.text, border: `1px solid ${config.border}` }}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {config.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1.5 text-sm" style={{ color: 'var(--ink-dim)' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>Requested: {formatDate(p.created_at)}</span>
                        {p.reviewed_at && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>Reviewed: {formatDate(p.reviewed_at)}</span>}
                      </div>
                      {p.status === 'rejected' && p.rejection_reason && (
                        <div className="mt-3">
                          <button
                            onClick={() => toggleReason(p.id)}
                            className="flex items-center gap-2 text-xs font-medium transition-all duration-300"
                            style={{ color: 'var(--c5)' }}
                          >
                            <svg
                              className="w-4 h-4 transition-transform duration-300"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={2}
                              stroke="currentColor"
                              style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                            </svg>
                            View Rejection Reason
                          </button>
                          {isExpanded && (
                            <div
                              className="mt-2 px-3 py-2 rounded-lg text-sm"
                              style={{ background: 'rgba(255, 92, 79, 0.1)', border: '1px solid rgba(255, 92, 79, 0.2)', color: 'var(--c5)' }}
                            >
                              {p.rejection_reason}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>{formatCents(p.amount)}</p>
                </div>

                {p.status === 'pending' && (
                  <div className="mt-4 pt-4 flex gap-3 items-end" style={{ borderTop: '1px solid var(--line-soft)' }}>
                    <button
                      onClick={() => handleApprove(p.id)}
                      disabled={actionLoading === p.id}
                      className="flex items-center gap-2 px-5 py-2.5 text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-all duration-300"
                      style={{ background: 'var(--c2)' }}
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
                        className="w-full px-4 py-2.5 rounded-xl text-sm transition-all duration-300"
                        style={{
                          background: 'var(--surface)',
                          border: '1px solid var(--line)',
                          color: 'var(--ink)',
                        }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--c5)'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--line)'}
                      />
                    </div>
                    <button
                      onClick={() => handleReject(p.id)}
                      disabled={actionLoading === p.id}
                      className="flex items-center gap-2 px-5 py-2.5 text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-all duration-300"
                      style={{ background: 'var(--c5)' }}
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
