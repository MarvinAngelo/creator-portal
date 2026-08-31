import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Wallet from './pages/Wallet';
import Payouts from './pages/Payouts';

const CREATOR_ID = 1;

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50">
        <nav className="bg-white border-b border-slate-200 px-6 py-3">
          <div className="max-w-5xl mx-auto flex items-center gap-8">
            <h1 className="text-xl font-bold text-indigo-600">Creator Portal</h1>
            <div className="flex gap-1">
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900'
                  }`
                }
              >
                Dashboard
              </NavLink>
              <NavLink
                to="/wallet"
                className={({ isActive }) =>
                  `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900'
                  }`
                }
              >
                Wallet
              </NavLink>
              <NavLink
                to="/payouts"
                className={({ isActive }) =>
                  `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900'
                  }`
                }
              >
                Payouts
              </NavLink>
            </div>
          </div>
        </nav>
        <main className="max-w-5xl mx-auto px-6 py-8">
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
