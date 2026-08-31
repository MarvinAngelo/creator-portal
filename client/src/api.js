const API_BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw { status: res.status, ...data };
  return data;
}

export const api = {
  getCreator: (id) => request(`/creators/${id}`),
  getPosts: (id) => request(`/creators/${id}/posts`),
  getBalance: (id) => request(`/creators/${id}/wallet/balance`),
  getTransactions: (id) => request(`/creators/${id}/wallet/transactions`),
  requestPayout: (creatorId, amount, idempotencyKey) =>
    request(`/payouts`, {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ creator_id: creatorId, amount }),
    }),
  getPayouts: (id) => request(`/creators/${id}/payouts`),
  approvePayout: (creatorId, payoutId) =>
    request(`/creators/${creatorId}/payouts/${payoutId}/approve`, { method: 'PATCH' }),
  rejectPayout: (creatorId, payoutId, reason) =>
    request(`/creators/${creatorId}/payouts/${payoutId}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    }),
};
