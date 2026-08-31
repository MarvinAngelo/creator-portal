import { useState, useEffect } from 'react';
import { api } from '../api';
import SocialIcon from '../components/SocialIcon';
import { ClockIcon, HeartIcon, MessageSquareIcon, UserGroupIcon, LinkIcon, UnlinkIcon } from '../components/Icons';

const PLATFORM_STYLES = {
  twitter: { iconBg: 'bg-white', iconBorder: 'border-2 border-slate-200', text: 'text-slate-800', light: 'bg-slate-50', badge: 'bg-slate-900 text-white' },
  youtube: { iconBg: 'bg-red-50', iconBorder: 'border-2 border-red-200', text: 'text-red-700', light: 'bg-red-50/50', badge: 'bg-red-600 text-white' },
  instagram: { iconBg: 'bg-pink-50', iconBorder: 'border-2 border-pink-200', text: 'text-pink-700', light: 'bg-pink-50/50', badge: 'bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 text-white' },
  tiktok: { iconBg: 'bg-white', iconBorder: 'border-2 border-slate-200', text: 'text-slate-800', light: 'bg-slate-50', badge: 'bg-slate-900 text-white' },
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
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const filteredPosts = filter === 'all' ? posts : posts.filter(p => p.platform === filter);

  if (!creator) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="bg-white rounded-2xl h-32" />
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl h-28" />
          <div className="bg-white rounded-2xl h-28" />
          <div className="bg-white rounded-2xl h-28" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="px-6 py-5">
          <div className="flex items-end gap-5">
            <img
              src={creator.avatar_url}
              alt={creator.name}
              className="w-20 h-20 rounded-2xl border-4 border-white shadow-lg"
            />
            <div className="flex-1 pb-1">
              <h2 className="text-2xl font-bold text-slate-800">{creator.name}</h2>
              <p className="text-slate-500 text-sm mt-0.5">{creator.bio}</p>
            </div>
            <div className="text-right pb-1">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Balance</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                {formatCents(creator.balance)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Connected Accounts */}
      <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <LinkIcon className="w-5 h-5 text-slate-400" />
          <h3 className="text-lg font-semibold text-slate-800">Connected Accounts</h3>
          <span className="ml-auto text-xs font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
            {connectedCount} connected
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {creator.connected_accounts.map((acc) => {
            const style = PLATFORM_STYLES[acc.platform] || { iconBg: 'bg-slate-100', iconBorder: 'border-2 border-slate-200', text: 'text-slate-700', light: 'bg-slate-50', badge: 'bg-slate-500 text-white' };
            const isDisconnected = disconnected.has(acc.id);
            return (
              <div
                key={acc.id}
                className={`group relative rounded-xl border border-slate-200/60 p-4 hover:shadow-md transition-all duration-200 ${isDisconnected ? 'opacity-50' : style.light}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl ${style.iconBg} ${style.iconBorder} flex items-center justify-center`}>
                    <SocialIcon platform={acc.platform} className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <ClockIcon className="w-3.5 h-3.5" />
                    {isDisconnected ? 'Disconnected' : 'Just now'}
                  </div>
                </div>
                <p className={`font-semibold text-sm ${isDisconnected ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{acc.handle}</p>
                <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                  <UserGroupIcon className="w-3.5 h-3.5" />
                  {formatNumber(acc.follower_count)} followers
                </div>
                {isDisconnected ? (
                  <button
                    onClick={() => handleReconnect(acc.id)}
                    className="mt-3 flex items-center gap-1 text-xs font-medium text-indigo-500 hover:text-indigo-700 transition-colors"
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    Reconnect
                  </button>
                ) : (
                  <button
                    onClick={() => handleDisconnect(acc.id)}
                    className="mt-3 flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
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
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="p-6 pb-0">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-slate-800">Recent Posts</h3>
            <div className="flex gap-1.5 bg-slate-100/80 rounded-xl p-1">
              {ALL_PLATFORMS.map((p) => (
                <button
                  key={p}
                  onClick={() => setFilter(p)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                    filter === p
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {p !== 'all' && <SocialIcon platform={p} className="w-3.5 h-3.5" />}
                  {p === 'all' ? 'All' : p}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {filteredPosts.map((post, i) => {
            const style = PLATFORM_STYLES[post.platform] || {};
            return (
              <div key={post.id} className="px-6 py-4 hover:bg-slate-50/50 transition-colors duration-150">
                <div className="flex gap-4">
                  {post.thumbnail_url ? (
                    <img
                      src={post.thumbnail_url}
                      alt=""
                      className="w-28 h-20 object-cover rounded-xl shrink-0"
                    />
                  ) : (
                    <div className="w-28 h-20 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                      <SocialIcon platform={post.platform} className="w-8 h-8 opacity-30" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${style.badge || 'bg-slate-200 text-slate-700'}`}>
                        <SocialIcon platform={post.platform} className="w-3 h-3" />
                        {post.platform}
                      </span>
                      <span className="text-xs text-slate-400">{formatDate(post.published_at)}</span>
                    </div>
                    <p className="text-sm text-slate-700 line-clamp-2 leading-relaxed">{post.content}</p>
                  </div>
                  <div className="flex flex-col gap-2 text-sm shrink-0 pt-1">
                    <span className="flex items-center gap-1.5 text-slate-400" title="Likes">
                      <HeartIcon className="w-4 h-4 text-pink-400" />
                      {formatNumber(post.likes)}
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-400" title="Comments">
                      <MessageSquareIcon className="w-4 h-4 text-blue-400" />
                      {formatNumber(post.comments)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          {filteredPosts.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-slate-400 text-sm">No posts from this channel.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
