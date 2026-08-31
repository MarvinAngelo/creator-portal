import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Wallet from './pages/Wallet';
import Payouts from './pages/Payouts';
import { LayoutDashboard, WalletIcon, BanknotesIcon } from './components/Icons';

const CREATOR_ID = 1;

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Top Nav */}
        <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">CP</span>
              </div>
              <h1 className="text-lg font-bold text-slate-800">Creator Portal</h1>
            </div>
            <div className="flex items-center gap-1 bg-slate-100/80 rounded-xl p-1">
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`
                }
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </NavLink>
              <NavLink
                to="/wallet"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`
                }
              >
                <WalletIcon className="w-4 h-4" />
                Wallet
              </NavLink>
              <NavLink
                to="/payouts"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`
                }
              >
                <BanknotesIcon className="w-4 h-4" />
                Payouts
              </NavLink>
            </div>
            <div className="flex items-center gap-3">
              <img
                src="https://ui-avatars.com/api/?name=Maya+Chen&background=6366f1&color=fff"
                alt="Maya Chen"
                className="w-9 h-9 rounded-full ring-2 ring-indigo-100"
              />
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto px-6 py-8">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard creatorId={CREATOR_ID} />} />
            <Route path="/wallet" element={<Wallet creatorId={CREATOR_ID} />} />
            <Route path="/payouts" element={<Payouts creatorId={CREATOR_ID} />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
