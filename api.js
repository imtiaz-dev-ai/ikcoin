// ── IK COIN — Backend API Connector v2 ───────────────────────────────────
const API_BASE = 'http://localhost:8000';

async function api(method, path, body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API_BASE + path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Server error');
  return data;
}

const API = {
  // Auth
  sendOTP:      (email)                    => api('POST', '/auth/send-otp',    { email }),
  register:     (name,email,phone,ref_code)=> api('POST', '/auth/register',    { name, email, phone, ref_code }),
  verifyOTP:    (email, otp)               => api('POST', '/auth/verify-otp',  { email, otp }),
  checkRef:     (code)                     => api('GET',  `/auth/check-ref/${code}`),

  // Users
  getUser:      (email)                    => api('GET',  `/users/${email}`),
  updateWallet: (email, wallet_cc)         => api('PUT',  '/users/wallet',     { email, wallet_cc }),
  updateAvatar: (email, avatar_url)        => api('PUT',  '/users/avatar',     { email, avatar_url }),
  getReferrals: (email)                    => api('GET',  `/users/${email}/referrals`),
  claimSurprise:(email)                    => api('POST', '/users/claim-surprise', { email }),

  // Transactions
  saveTx:       (data)                     => api('POST', '/transactions/',    data),
  getUserTxs:   (email)                    => api('GET',  `/transactions/${email}`),
  shareCoins:   (from_email,to_email,amount)=> api('POST','/transactions/share',{ from_email, to_email, amount }),

  // Settings
  getSettings:  ()                         => api('GET',  '/settings/'),
  saveSettings: (data)                     => api('PUT',  '/settings/bulk',    data),

  // Payments
  submitDeposit:  (email,amount_usd,txid)  => api('POST', '/payments/deposit',  { email, amount_usd, txid }),
  submitWithdraw: (email,amount_cc,binance_id) => api('POST', '/payments/withdraw', { email, amount_cc, binance_id }),
  getMyDeposits:  (email)                  => api('GET',  `/payments/deposits/${email}`),
  getMyWithdrawals:(email)                 => api('GET',  `/payments/withdrawals/${email}`),

  // Support
  createTicket: (email,subject,message)    => api('POST', '/support/',         { email, subject, message }),
  getMyTickets: (email)                    => api('GET',  `/support/${email}`),
  getTicketReplies:(ticket_id)             => api('GET',  `/support/${ticket_id}/replies`),
  replyTicket:  (ticket_id,sender,message) => api('POST', '/support/reply',    { ticket_id, sender, message }),

  // Notifications
  getNotifications:(email)                 => api('GET',  `/notifications/${email}`),
  getUnreadCount:  (email)                 => api('GET',  `/notifications/${email}/unread`),
  markAllRead:     (email)                 => api('PUT',  '/notifications/read-all', { email }),

  // Admin
  getStats:     ()                         => api('GET',  '/admin/stats'),
  getAllUsers:   ()                         => api('GET',  '/admin/users'),
  updateUserStatus:(email,status)          => api('PUT',  '/admin/users/status', { email, status }),
  getClaims:    ()                         => api('GET',  '/admin/claims'),
  getLogs:      ()                         => api('GET',  '/admin/logs'),
  clearTxs:     ()                         => api('DELETE','/admin/transactions'),
  adminDeposits:()                         => api('GET',  '/payments/admin/deposits'),
  adminWithdrawals:()                      => api('GET',  '/payments/admin/withdrawals'),
  approveDeposit:  (id,note)               => api('PUT',  '/payments/admin/deposit',    { id, action:'approve', note }),
  rejectDeposit:   (id,note)               => api('PUT',  '/payments/admin/deposit',    { id, action:'reject',  note }),
  approveWithdrawal:(id,note)              => api('PUT',  '/payments/admin/withdrawal', { id, action:'approve', note }),
  rejectWithdrawal: (id,note)              => api('PUT',  '/payments/admin/withdrawal', { id, action:'reject',  note }),
  getAllTickets: ()                         => api('GET',  '/support/'),
  adminReply:   (ticket_id,message)        => api('POST', '/support/reply',    { ticket_id, sender:'admin', message }),
  closeTicket:  (ticket_id)                => api('PUT',  '/support/close',    { ticket_id }),
};
