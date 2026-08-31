import { useState, useEffect } from 'react';
import { api } from '../api';
import { ArrowUpIcon, ArrowDownIcon, ArrowPathIcon, ClockIcon } from '../components/Icons';

export default function Wallet({ creatorId }) {
  const [balance, setBalance] = useState(null);
  const [pending, setPending] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const load = () => {
    api.getBalance(creatorId).then(setBalance);
    api.getPending(creatorId).then(setPending);
    api.getTransactions(creatorId).then(setTransactions);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const cents = Math.round(parseFloat(amount) * 100);
      const payout = await api.requestPayout(creatorId, cents, idempotencyKey);
      setMessage({ type: 'success', text: `Payout request #${payout.id} created for $${(cents / 100).toFixed(2)}` });
      setAmount('');
      load();
    } catch (err) {
      setMessage({ type: 'error', text: err.error || 'Request failed' });
    } finally {
      setLoading(false);
    }
  };

  const formatCents = (cents) => `$${(cents / 100).toFixed(2)}`;
  const formatDate = (d) => new Date(d + 'Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const txIcon = (type) => {
    if (type === 'credit') return <ArrowDownIcon className="w-4 h-4" />;
    if (type === 'payout_refund') return <ArrowPathIcon className="w-4 h-4" />;
    return <ArrowUpIcon className="w-4 h-4" />;
  };

  const txColor = (type) => {
    if (type === 'credit') return 'var(--c2)';
    if (type === 'payout_refund') return 'var(--c3)';
    return 'var(--c5)';
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--ink)' }}>Wallet</h2>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="relative rounded-2xl p-6 text-white overflow-hidden" style={{ background: 'linear-gradient(135deg, var(--c1), #6366f1)', boxShadow: '0 0 30px -8px var(--c1)' }}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full -mr-10 -mt-10" style={{ background: 'rgba(255,255,255,0.1)' }} />
          <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full -ml-5 -mb-5" style={{ background: 'rgba(255,255,255,0.05)' }} />
          <p className="text-sm font-medium uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', letterSpacing: '0.14em' }}>Available Balance</p>
          <p className="text-4xl font-bold mt-2">
            {balance !== null ? formatCents(balance.balance) : '...'}
          </p>
          <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.5)' }}>Ready for withdrawal</p>
        </div>
        <div className="relative rounded-2xl p-6 text-white overflow-hidden" style={{ background: 'linear-gradient(135deg, var(--c3), #f97316)', boxShadow: '0 0 30px -8px var(--c3)' }}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full -mr-10 -mt-10" style={{ background: 'rgba(255,255,255,0.1)' }} />
          <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full -ml-5 -mb-5" style={{ background: 'rgba(255,255,255,0.05)' }} />
          <div className="flex items-center gap-2">
            <ClockIcon className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.7)' }} />
            <p className="text-sm font-medium uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', letterSpacing: '0.14em' }}>Pending Earnings</p>
          </div>
          <p className="text-4xl font-bold mt-2">
            {pending !== null ? formatCents(pending.pending) : '...'}
          </p>
          <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.5)' }}>Awaiting approval</p>
        </div>
      </div>

      {/* Payout Request Form */}
      <div className="kv-card p-6">
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--ink)' }}>Request Payout</h3>
        <form onSubmit={handleSubmit} className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink-dim)' }}>Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-medium" style={{ color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-7 pr-4 py-2.5 rounded-xl text-lg font-medium transition-all duration-300"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  color: 'var(--ink)',
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--line)'}
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading || !amount}
            className="px-6 py-2.5 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
            style={{
              background: 'var(--ink)',
              color: 'var(--bg)',
              boxShadow: loading ? 'none' : '0 0 26px -8px var(--accent)',
            }}
            onMouseEnter={(e) => !loading && (e.target.style.boxShadow = '0 0 34px -6px var(--accent)')}
            onMouseLeave={(e) => !loading && (e.target.style.boxShadow = '0 0 26px -8px var(--accent)')}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Submitting...
              </span>
            ) : 'Request Payout'}
          </button>
        </form>
        {message && (
          <div
            className="mt-4 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2"
            style={{
              background: message.type === 'success' ? 'rgba(88, 224, 140, 0.1)' : 'rgba(255, 92, 79, 0.1)',
              color: message.type === 'success' ? 'var(--c2)' : 'var(--c5)',
              border: `1px solid ${message.type === 'success' ? 'rgba(88, 224, 140, 0.2)' : 'rgba(255, 92, 79, 0.2)'}`,
            }}
          >
            {message.type === 'success' ? '✓' : '✕'} {message.text}
          </div>
        )}
      </div>

      {/* Transaction History */}
      <div className="kv-card overflow-hidden">
        <div className="p-6 pb-0">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>Transaction History</h3>
        </div>
        {transactions.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm" style={{ color: 'var(--ink-faint)' }}>No transactions yet.</p>
          </div>
        ) : (
          <div>
            {transactions.map((tx) => (
              <div key={tx.id} className="px-6 py-4 transition-colors" style={{ borderBottom: '1px solid var(--line-soft)' }}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `color-mix(in oklab, ${txColor(tx.type)} 15%, transparent)`, color: txColor(tx.type) }}>
                    {txIcon(tx.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>{tx.description}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>{formatDate(tx.created_at)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold" style={{ color: txColor(tx.type) }}>
                      {tx.type === 'credit' ? '+' : '-'}{formatCents(Math.abs(tx.amount))}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>Bal: {formatCents(tx.balance_after)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
