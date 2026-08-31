import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Wallet from './pages/Wallet';
import Payouts from './pages/Payouts';
import { LayoutDashboard, WalletIcon, BanknotesIcon } from './components/Icons';
import { DarkModeProvider, useDarkMode } from './context/DarkModeContext';

const CREATOR_ID = 1;

function DarkModeToggle() {
  const { dark, toggle } = useDarkMode();
  return (
    <button
      onClick={toggle}
      className="w-9 h-9 rounded-full flex items-center justify-center border border-[var(--line-soft)] hover:border-[var(--accent)] transition-all duration-300"
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {dark ? (
        <svg className="w-4 h-4 text-[var(--c3)]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
        </svg>
      ) : (
        <svg className="w-4 h-4 text-[var(--ink-faint)]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" />
        </svg>
      )}
    </button>
  );
}

function AppContent() {
  return (
    <BrowserRouter>
      <div className="min-h-screen transition-colors duration-500" style={{ background: 'var(--bg)' }}>
        {/* Top Nav */}
        <nav className="sticky top-0 z-50 glass border-b" style={{ borderColor: 'var(--line-soft)' }}>
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent)', boxShadow: '0 0 20px -4px var(--accent)' }}>
                <span className="text-white font-bold text-sm">CP</span>
              </div>
              <h1 className="text-lg font-semibold tracking-tight" style={{ color: 'var(--ink)' }}>Creator Portal</h1>
            </div>
            <div className="flex items-center gap-1 rounded-xl p-1" style={{ background: 'var(--surface)' }}>
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? 'glow-accent'
                      : 'hover:opacity-80'
                  }`
                }
                style={({ isActive }) => ({
                  background: isActive ? 'var(--ink)' : 'transparent',
                  color: isActive ? 'var(--bg)' : 'var(--ink-faint)',
                })}
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </NavLink>
              <NavLink
                to="/wallet"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? 'glow-accent'
                      : 'hover:opacity-80'
                  }`
                }
                style={({ isActive }) => ({
                  background: isActive ? 'var(--ink)' : 'transparent',
                  color: isActive ? 'var(--bg)' : 'var(--ink-faint)',
                })}
              >
                <WalletIcon className="w-4 h-4" />
                Wallet
              </NavLink>
              <NavLink
                to="/payouts"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? 'glow-accent'
                      : 'hover:opacity-80'
                  }`
                }
                style={({ isActive }) => ({
                  background: isActive ? 'var(--ink)' : 'transparent',
                  color: isActive ? 'var(--bg)' : 'var(--ink-faint)',
                })}
              >
                <BanknotesIcon className="w-4 h-4" />
                Payouts
              </NavLink>
            </div>
            <div className="flex items-center gap-3">
              <DarkModeToggle />
              <img
                src="https://ui-avatars.com/api/?name=Maya+Chen&background=3da9ff&color=000004"
                alt="Maya Chen"
                className="w-9 h-9 rounded-full"
                style={{ border: '1px solid var(--line)' }}
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

export default function App() {
  return (
    <DarkModeProvider>
      <AppContent />
    </DarkModeProvider>
  );
}
