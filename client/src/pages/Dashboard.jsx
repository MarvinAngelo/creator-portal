import { useState, useEffect } from 'react';
import { api } from '../api';

const PLATFORM_ICONS = {
  twitter: '🐦',
  youtube: '📺',
  instagram: '📷',
  tiktok: '🎵',
};

const PLATFORM_COLORS = {
  twitter: 'bg-blue-50 text-blue-700',
  youtube: 'bg-red-50 text-red-700',
  instagram: 'bg-pink-50 text-pink-700',
  tiktok: 'bg-slate-800 text-white',
};

export default function Dashboard({ creatorId }) {
  const [creator, setCreator] = useState(null);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    api.getCreator(creatorId).then(setCreator);
    api.getPosts(creatorId).then(setPosts);
  }, []);

  const formatCents = (cents) => `$${(cents / 100).toFixed(2)}`;
  const formatNumber = (n) => n >= 1000 ? (n / 1000).toFixed(1) + 'K' : n.toString();
  const formatDate = (d) => new Date(d + 'Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

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
        <div className="flex flex-wrap gap-3">
          {creator.connected_accounts.map((acc) => (
            <div
              key={acc.id}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${PLATFORM_COLORS[acc.platform] || 'bg-slate-100 text-slate-700'}`}
            >
              {PLATFORM_ICONS[acc.platform] || '🔗'} {acc.handle}
            </div>
          ))}
        </div>
      </div>

      {/* Recent Posts */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Recent Posts</h3>
        <div className="divide-y divide-slate-100">
          {posts.map((post) => (
            <div key={post.id} className="py-4">
              <div className="flex items-start justify-between gap-4">
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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
