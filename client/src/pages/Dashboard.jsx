import { useState, useEffect } from 'react';
import { api } from '../api';

const PLATFORM_ICONS = {
  twitter: '🐦',
  youtube: '📺',
  instagram: '📷',
  tiktok: '🎵',
};

const PLATFORM_COLORS = {
  twitter: 'bg-blue-50 text-blue-700 border-blue-200',
  youtube: 'bg-red-50 text-red-700 border-red-200',
  instagram: 'bg-pink-50 text-pink-700 border-pink-200',
  tiktok: 'bg-slate-800 text-white border-slate-700',
};

const ALL_PLATFORMS = ['all', 'twitter', 'youtube', 'instagram', 'tiktok'];

export default function Dashboard({ creatorId }) {
  const [creator, setCreator] = useState(null);
  const [posts, setPosts] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    api.getCreator(creatorId).then(setCreator);
    api.getPosts(creatorId).then(setPosts);
  }, []);

  const formatCents = (cents) => `$${(cents / 100).toFixed(2)}`;
  const formatNumber = (n) => n >= 1000000 ? (n / 1000000).toFixed(1) + 'M' : n >= 1000 ? (n / 1000).toFixed(1) + 'K' : n.toString();
  const formatDate = (d) => new Date(d + 'Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const formatSynced = (d) => {
    const diff = Date.now() - new Date(d + 'Z').getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const filteredPosts = filter === 'all' ? posts : posts.filter(p => p.platform === filter);

  if (!creator) return <p className="text-slate-400">Loading...</p>;

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex items-center gap-5">
        <img src={creator.avatar_url} alt={creator.name} className="w-16 h-16 rounded-full" />
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{creator.name}</h2>
          <p className="text-slate-500 text-sm">{creator.bio}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-sm text-slate-400">Balance</p>
          <p className="text-2xl font-bold text-indigo-600">{formatCents(creator.balance)}</p>
        </div>
      </div>

      {/* Connected Accounts */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Connected Accounts</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {creator.connected_accounts.map((acc) => (
            <div
              key={acc.id}
              className={`relative p-3 rounded-lg border ${PLATFORM_COLORS[acc.platform] || 'bg-slate-50 text-slate-700 border-slate-200'}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">
                  {PLATFORM_ICONS[acc.platform] || '🔗'} {acc.platform}
                </span>
                <span className="text-xs opacity-70">{formatSynced(acc.last_synced_at)}</span>
              </div>
              <p className="text-sm font-semibold">{acc.handle}</p>
              <p className="text-xs opacity-70 mt-1">{formatNumber(acc.follower_count)} followers</p>
              <button className="mt-2 text-xs underline opacity-60 hover:opacity-100">Disconnect</button>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Posts */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">Recent Posts</h3>
          <div className="flex gap-1">
            {ALL_PLATFORMS.map((p) => (
              <button
                key={p}
                onClick={() => setFilter(p)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filter === p
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p === 'all' ? 'All' : p}
              </button>
            ))}
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {filteredPosts.map((post) => (
            <div key={post.id} className="py-4 flex gap-4">
              {post.thumbnail_url && (
                <img
                  src={post.thumbnail_url}
                  alt=""
                  className="w-24 h-16 object-cover rounded-lg shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${PLATFORM_COLORS[post.platform] || 'bg-slate-100 text-slate-600'}`}>
                    {post.platform}
                  </span>
                  <span className="text-xs text-slate-400">{formatDate(post.published_at)}</span>
                </div>
                <p className="text-sm text-slate-700 line-clamp-2">{post.content}</p>
              </div>
              <div className="flex gap-4 text-sm text-slate-500 shrink-0">
                <span title="Likes">❤️ {formatNumber(post.likes)}</span>
                <span title="Comments">💬 {formatNumber(post.comments)}</span>
              </div>
            </div>
          ))}
          {filteredPosts.length === 0 && (
            <p className="py-8 text-center text-slate-400 text-sm">No posts from this channel.</p>
          )}
        </div>
      </div>
    </div>
  );
}
