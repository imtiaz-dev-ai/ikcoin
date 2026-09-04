// ── SUPABASE CLIENT ───────────────────────────────────────────────────────
const SUPABASE_URL  = 'https://syjjnvbtxwbzmzeamjht.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5ampudmJ0eHdiem16ZWFtamh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1NTkxNzUsImV4cCI6MjEwMDEzNTE3NX0.T_IV_k5hWh9NZQcceMVL_W1jblre-GSiwzyAjH4bTvI';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON);

// ── HELPERS ───────────────────────────────────────────────────────────────
const DB = {
  // USERS
  getUser:        (email)        => db.from('users').select('*').eq('email', email).single(),
  createUser:     (data)         => db.from('users').insert(data).select().single(),
  updateUser:     (email, data)  => db.from('users').update(data).eq('email', email),
  checkRefCode:   (code)         => db.from('users').select('name,referral_code').eq('referral_code', code).single(),

  // OTP
  upsertOTP:      (email, code, expires) => db.from('otps').upsert({ email, code, expires_at: expires }),
  getOTP:         (email)        => db.from('otps').select('*').eq('email', email).single(),
  deleteOTP:      (email)        => db.from('otps').delete().eq('email', email),

  // TRANSACTIONS
  saveTx:         (data)         => db.from('transactions').insert(data),
  getUserTxs:     (email)        => db.from('transactions').select('*').eq('email', email).order('created_at', { ascending: false }).limit(50),
  getAllTxs:       ()             => db.from('transactions').select('*').order('created_at', { ascending: false }).limit(200),
  clearTxs:       ()             => db.from('transactions').delete().neq('id', 0),

  // REFERRALS
  getReferrals:   (email)        => db.from('referrals').select('*').eq('referrer_email', email),
  addReferral:    (data)         => db.from('referrals').insert(data),

  // SETTINGS
  getSettings:    ()             => db.from('settings').select('key,value'),
  upsertSetting:  (key, value)   => db.from('settings').upsert({ key, value }),

  // SURPRISE CLAIMS
  addClaim:       (data)         => db.from('surprise_claims').insert(data),
  getClaims:      ()             => db.from('surprise_claims').select('*').order('created_at', { ascending: false }),

  // DEPOSIT REQUESTS
  addDeposit:     (data)         => db.from('deposit_requests').insert(data).select().single(),
  getDeposits:    (email)        => db.from('deposit_requests').select('*').eq('email', email).order('created_at', { ascending: false }),
  getAllDeposits:  ()             => db.from('deposit_requests').select('*').order('created_at', { ascending: false }),
  updateDeposit:  (id, data)     => db.from('deposit_requests').update(data).eq('id', id),

  // WITHDRAWAL REQUESTS
  addWithdrawal:  (data)         => db.from('withdrawal_requests').insert(data).select().single(),
  getWithdrawals: (email)        => db.from('withdrawal_requests').select('*').eq('email', email).order('created_at', { ascending: false }),
  getAllWithdrawals: ()           => db.from('withdrawal_requests').select('*').order('created_at', { ascending: false }),
  updateWithdrawal: (id, data)   => db.from('withdrawal_requests').update(data).eq('id', id),

  // SUPPORT TICKETS
  addTicket:      (data)         => db.from('support_tickets').insert(data).select().single(),
  getUserTickets: (email)        => db.from('support_tickets').select('*').eq('email', email).order('created_at', { ascending: false }),
  getAllTickets:   ()             => db.from('support_tickets').select('*').order('created_at', { ascending: false }),
  updateTicket:   (id, data)     => db.from('support_tickets').update(data).eq('id', id),
  addReply:       (data)         => db.from('ticket_replies').insert(data),
  getReplies:     (ticket_id)    => db.from('ticket_replies').select('*').eq('ticket_id', ticket_id).order('created_at'),

  // NOTIFICATIONS
  addNotif:       (data)         => db.from('notifications').insert(data),
  getNotifs:      (email)        => db.from('notifications').select('*').eq('email', email).order('created_at', { ascending: false }).limit(50),
  markNotifsRead: (email)        => db.from('notifications').update({ is_read: true }).eq('email', email),
  unreadCount:    (email)        => db.from('notifications').select('id').eq('email', email).eq('is_read', false),

  // ADMIN LOGS
  addLog:         (action, detail) => db.from('admin_logs').insert({ action, detail }),
  getLogs:        ()             => db.from('admin_logs').select('*').order('created_at', { ascending: false }).limit(100),

  // ALL USERS (admin)
  getAllUsers:    ()              => db.from('users').select('*').order('created_at', { ascending: false }),
};
