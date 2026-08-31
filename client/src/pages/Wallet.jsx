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
    if (type === 'credit') return 'text-emerald-600 bg-emerald-50';
    if (type === 'payout_refund') return 'text-amber-600 bg-amber-50';
    return 'text-red-500 bg-red-50';
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Wallet</h2>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="relative bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-200 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10" />
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full -ml-5 -mb-5" />
          <p className="text-sm font-medium text-white/80 uppercase tracking-wide">Available Balance</p>
          <p className="text-4xl font-bold mt-2">
            {balance !== null ? formatCents(balance.balance) : '...'}
          </p>
          <p className="text-xs text-white/60 mt-2">Ready for withdrawal</p>
        </div>
        <div className="relative bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-6 text-white shadow-lg shadow-amber-200 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10" />
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full -ml-5 -mb-5" />
          <div className="flex items-center gap-2">
            <ClockIcon className="w-5 h-5 text-white/80" />
            <p className="text-sm font-medium text-white/80 uppercase tracking-wide">Pending Earnings</p>
          </div>
          <p className="text-4xl font-bold mt-2">
            {pending !== null ? formatCents(pending.pending) : '...'}
          </p>
          <p className="text-xs text-white/60 mt-2">Awaiting approval</p>
        </div>
      </div>

      {/* Payout Request Form */}
      <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Request Payout</h3>
        <form onSubmit={handleSubmit} className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-600 mb-2">Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-7 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-lg font-medium"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading || !amount}
            className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
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
          <div className={`mt-4 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.type === 'success' ? '✓' : '✕'} {message.text}
          </div>
        )}
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="p-6 pb-0">
          <h3 className="text-lg font-semibold text-slate-800">Transaction History</h3>
        </div>
        {transactions.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-slate-400 text-sm">No transactions yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {transactions.map((tx) => (
              <div key={tx.id} className="px-6 py-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${txColor(tx.type)}`}>
                    {txIcon(tx.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{tx.description}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{formatDate(tx.created_at)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-bold ${
                      tx.type === 'credit' ? 'text-emerald-600' : tx.type === 'payout_refund' ? 'text-amber-600' : 'text-red-500'
                    }`}>
                      {tx.type === 'credit' ? '+' : '-'}{formatCents(Math.abs(tx.amount))}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">Bal: {formatCents(tx.balance_after)}</p>
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
