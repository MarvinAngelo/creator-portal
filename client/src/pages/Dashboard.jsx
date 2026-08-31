import { useState, useEffect } from 'react';
import { api } from '../api';
import SocialIcon from '../components/SocialIcon';
import { ClockIcon, HeartIcon, MessageSquareIcon, UserGroupIcon, LinkIcon, UnlinkIcon } from '../components/Icons';

const PLATFORM_STYLES = {
  twitter: { iconBg: 'var(--surface)', iconBorder: 'var(--line)', light: 'var(--surface)', badge: '#1d9bf0' },
  youtube: { iconBg: 'rgba(255, 0, 0, 0.08)', iconBorder: 'rgba(255, 0, 0, 0.2)', light: 'rgba(255, 0, 0, 0.03)', badge: '#dc2626' },
  instagram: { iconBg: 'rgba(228, 64, 95, 0.08)', iconBorder: 'rgba(228, 64, 95, 0.2)', light: 'rgba(228, 64, 95, 0.03)', badge: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)' },
  tiktok: { iconBg: 'var(--surface)', iconBorder: 'var(--line)', light: 'var(--surface)', badge: '#ff0050' },
};

const ALL_PLATFORMS = ['all', 'twitter', 'youtube', 'instagram', 'tiktok'];

export default function Dashboard({ creatorId }) {
  const [creator, setCreator] = useState(null);
  const [posts, setPosts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [disconnected, setDisconnected] = useState(new Set());

  useEffect(() => {
    api.getCreator(creatorId).then(setCreator);
    api.getPosts(creatorId).then(setPosts);
  }, []);

  const handleDisconnect = (accId) => {
    setDisconnected(prev => new Set([...prev, accId]));
  };

  const handleReconnect = (accId) => {
    setDisconnected(prev => {
      const next = new Set(prev);
      next.delete(accId);
      return next;
    });
  };

  const connectedCount = creator ? creator.connected_accounts.length - disconnected.size : 0;

  const formatCents = (cents) => `$${(cents / 100).toFixed(2)}`;
  const formatNumber = (n) => n >= 1000000 ? (n / 1000000).toFixed(1) + 'M' : n >= 1000 ? (n / 1000).toFixed(1) + 'K' : n.toString();
  const formatDate = (d) => new Date(d + 'Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const formatSynced = (d) => {
    const diff = Date.now() - new Date(d + 'Z').getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);
    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (weeks < 4) return `${weeks}w ago`;
    if (months < 12) return `${months}mo ago`;
    return `${years}y ago`;
  };

  const filteredPosts = filter === 'all' ? posts : posts.filter(p => p.platform === filter);

  if (!creator) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="kv-card h-32" />
        <div className="kv-grid grid-cols-3">
          <div className="kv-grid-item h-28" />
          <div className="kv-grid-item h-28" />
          <div className="kv-grid-item h-28" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="kv-card p-6">
        <div className="flex items-end gap-5">
          <img
            src={creator.avatar_url}
            alt={creator.name}
            className="w-20 h-20 rounded-2xl"
            style={{ border: '2px solid var(--line)' }}
          />
          <div className="flex-1 pb-1">
            <h2 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--ink)' }}>{creator.name}</h2>
            <p className="text-sm mt-0.5" style={{ color: 'var(--ink-dim)' }}>{creator.bio}</p>
          </div>
          <div className="text-right pb-1">
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>Balance</p>
            <p className="text-3xl font-bold" style={{ color: 'var(--accent)' }}>
              {formatCents(creator.balance)}
            </p>
          </div>
        </div>
      </div>

      {/* Connected Accounts */}
      <div className="kv-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <LinkIcon className="w-5 h-5" style={{ color: 'var(--ink-faint)' }} />
          <h3 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>Connected Accounts</h3>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ color: 'var(--accent)', background: 'rgba(61, 169, 255, 0.1)', border: '1px solid rgba(61, 169, 255, 0.2)', fontFamily: 'var(--font-mono)' }}>
            {connectedCount} connected
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {creator.connected_accounts.map((acc) => {
            const style = PLATFORM_STYLES[acc.platform] || { iconBg: 'var(--surface)', iconBorder: 'var(--line)', light: 'var(--surface)', badge: 'var(--ink-faint)' };
            const isDisconnected = disconnected.has(acc.id);
            return (
              <div
                key={acc.id}
                className="kv-card p-4"
                style={{ opacity: isDisconnected ? 0.5 : 1 }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: style.iconBg, border: `1px solid ${style.iconBorder}` }}>
                    <SocialIcon platform={acc.platform} className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>
                    <ClockIcon className="w-3.5 h-3.5" />
                    {isDisconnected ? 'Disconnected' : 'Just now'}
                  </div>
                </div>
                <p className="font-semibold text-sm" style={{ color: isDisconnected ? 'var(--ink-faint)' : 'var(--ink)', textDecoration: isDisconnected ? 'line-through' : 'none' }}>{acc.handle}</p>
                <div className="flex items-center gap-1 mt-1 text-xs" style={{ color: 'var(--ink-dim)' }}>
                  <UserGroupIcon className="w-3.5 h-3.5" />
                  {formatNumber(acc.follower_count)} followers
                </div>
                {isDisconnected ? (
                  <button
                    onClick={() => handleReconnect(acc.id)}
                    className="mt-3 flex items-center gap-1 text-xs font-medium transition-all duration-300"
                    style={{ color: 'var(--accent)' }}
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    Reconnect
                  </button>
                ) : (
                  <button
                    onClick={() => handleDisconnect(acc.id)}
                    className="mt-3 flex items-center gap-1 text-xs font-medium transition-all duration-300"
                    style={{ color: 'var(--ink-faint)' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--c5)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--ink-faint)'}
                  >
                    <UnlinkIcon className="w-3.5 h-3.5" />
                    Disconnect
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Posts */}
      <div className="kv-card overflow-hidden">
        <div className="p-6 pb-0">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>Recent Posts</h3>
            <div className="flex gap-1.5 rounded-xl p-1" style={{ background: 'var(--surface)' }}>
              {ALL_PLATFORMS.map((p) => (
                <button
                  key={p}
                  onClick={() => setFilter(p)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300"
                  style={{
                    background: filter === p ? 'var(--ink)' : 'transparent',
                    color: filter === p ? 'var(--bg)' : 'var(--ink-faint)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {p !== 'all' && <SocialIcon platform={p} className="w-3.5 h-3.5" />}
                  {p === 'all' ? 'All' : p}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ borderTop: '1px solid var(--line-soft)' }}>
          {filteredPosts.map((post) => {
            const style = PLATFORM_STYLES[post.platform] || {};
            return (
              <div key={post.id} className="px-6 py-4 transition-colors duration-200" style={{ borderBottom: '1px solid var(--line-soft)' }}>
                <div className="flex gap-4">
                  {post.thumbnail_url ? (
                    <img
                      src={post.thumbnail_url}
                      alt=""
                      className="w-28 h-20 object-cover rounded-xl shrink-0"
                    />
                  ) : (
                    <div className="w-28 h-20 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--surface)', border: '1px solid var(--line-soft)' }}>
                      <SocialIcon platform={post.platform} className="w-8 h-8 opacity-20" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium text-white" style={{ background: style.badge || 'var(--ink-faint)' }}>
                        <SocialIcon platform={post.platform} className="w-3 h-3" />
                        {post.platform}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>{formatDate(post.published_at)}</span>
                    </div>
                    <p className="text-sm line-clamp-2 leading-relaxed" style={{ color: 'var(--ink-dim)' }}>{post.content}</p>
                  </div>
                  <div className="flex flex-col gap-2 text-sm shrink-0 pt-1">
                    <span className="flex items-center gap-1.5" style={{ color: 'var(--ink-faint)' }} title="Likes">
                      <HeartIcon className="w-4 h-4" style={{ color: 'var(--c4)' }} />
                      {formatNumber(post.likes)}
                    </span>
                    <span className="flex items-center gap-1.5" style={{ color: 'var(--ink-faint)' }} title="Comments">
                      <MessageSquareIcon className="w-4 h-4" style={{ color: 'var(--c1)' }} />
                      {formatNumber(post.comments)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          {filteredPosts.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-sm" style={{ color: 'var(--ink-faint)' }}>No posts from this channel.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
