import { useState, useEffect } from 'react';
import { api } from '../api';

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

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Wallet</h2>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Available Balance</p>
          <p className="text-4xl font-bold text-slate-900 mt-1">
            {balance !== null ? formatCents(balance.balance) : '...'}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Pending Earnings</p>
          <p className="text-4xl font-bold text-amber-600 mt-1">
            {pending !== null ? formatCents(pending.pending) : '...'}
          </p>
        </div>
      </div>

      {/* Payout Request Form */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Request Payout</h3>
        <form onSubmit={handleSubmit} className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-600 mb-1">Amount ($)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading || !amount}
            className="px-5 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Submitting...' : 'Request Payout'}
          </button>
        </form>
        {message && (
          <div className={`mt-3 px-4 py-2 rounded-lg text-sm ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {message.text}
          </div>
        )}
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Transaction History</h3>
        {transactions.length === 0 ? (
          <p className="text-slate-400 text-sm">No transactions yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {transactions.map((tx) => (
              <div key={tx.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">{tx.description}</p>
                  <p className="text-xs text-slate-400">{formatDate(tx.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${
                    tx.type === 'credit' ? 'text-green-600' : 'text-red-500'
                  }`}>
                    {tx.type === 'credit' ? '+' : '-'}{formatCents(Math.abs(tx.amount))}
                  </p>
                  <p className="text-xs text-slate-400">Bal: {formatCents(tx.balance_after)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
