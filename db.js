// ── IK COIN — PHP API Connector ──────────────────────────────────────────
const API = 'api'; // relative path — hosting pe sahi kaam karega

async function _call(method, url, body=null) {
    const opts = { method, headers: {'Content-Type':'application/json'} };
    if(body) opts.body = JSON.stringify(body);
    const res  = await fetch(url, opts);
    const data = await res.json();
    if(!res.ok) throw new Error(data.error || 'Server error');
    return data;
}

const DB = {
    // Auth
    login:        (email)                    => _call('POST', `${API}/login.php`,      {email}),
    register:     (name,email,phone,ref)     => _call('POST', `${API}/register.php`,   {name,email,phone,ref_code:ref}),
    sendOTP:      (email)                    => _call('POST', `${API}/send_otp.php`,   {email}),
    verifyOTP:    (email,otp)                => _call('POST', `${API}/verify_otp.php`, {email,otp}),

    // User / Profile
    getUser:      (email)                    => _call('GET',  `${API}/profile.php?email=${encodeURIComponent(email)}`),
    updateWallet: (email,wallet_cc)          => _call('POST', `${API}/profile.php`,    {action:'update_wallet',email,wallet_cc}),
    updateAvatar: (email,avatar_url)         => _call('POST', `${API}/profile.php`,    {action:'update_avatar',email,avatar_url}),
    markNotifsRead:(email)                   => _call('POST', `${API}/profile.php`,    {action:'mark_notifs_read',email}),
    claimSurprise:(email)                    => _call('POST', `${API}/profile.php`,    {action:'claim_surprise',email}),
    submitTicket: (email,subject,message)    => _call('POST', `${API}/profile.php`,    {action:'submit_ticket',email,subject,message}),
    getMyTickets: (email)                    => _call('POST', `${API}/profile.php`,    {action:'get_tickets',email}),

    // Payments
    submitDeposit:  (email,amount_usd,txid)  => _call('POST', `${API}/deposit.php`,    {email,amount_usd,txid}),
    submitWithdraw: (email,amount_cc,binance_id) => _call('POST', `${API}/withdraw.php`, {email,amount_cc,binance_id}),

    // Admin
    adminGetUsers:       ()                  => _call('GET',  `${API}/admin/users.php`),
    adminSetStatus:      (email,status)      => _call('POST', `${API}/admin/users.php`,    {email,status}),
    adminGetDeposits:    ()                  => _call('GET',  `${API}/admin/deposits.php`),
    adminDepositAction:  (id,action)         => _call('POST', `${API}/admin/deposits.php`,  {id,action}),
    adminGetWithdrawals: ()                  => _call('GET',  `${API}/admin/withdrawals.php`),
    adminWithdrawAction: (id,action)         => _call('POST', `${API}/admin/withdrawals.php`,{id,action}),
    adminGetSettings:    ()                  => _call('GET',  `${API}/admin/settings.php?type=settings`),
    adminGetStats:       ()                  => _call('GET',  `${API}/admin/settings.php?type=stats`),
    adminGetTxns:        ()                  => _call('GET',  `${API}/admin/settings.php?type=transactions`),
    adminGetClaims:      ()                  => _call('GET',  `${API}/admin/settings.php?type=claims`),
    adminGetLogs:        ()                  => _call('GET',  `${API}/admin/settings.php?type=logs`),
    adminGetTickets:     ()                  => _call('GET',  `${API}/admin/settings.php?type=tickets`),
    adminSaveSettings:   (settings)          => _call('POST', `${API}/admin/settings.php`,  {action:'save_settings',settings}),
    adminTicketReply:    (ticket_id,message,email) => _call('POST',`${API}/admin/settings.php`,{action:'ticket_reply',ticket_id,message,email}),
    adminCloseTicket:    (ticket_id,email)   => _call('POST', `${API}/admin/settings.php`,  {action:'close_ticket',ticket_id,email}),
    adminClearTxns:      ()                  => _call('POST', `${API}/admin/settings.php`,  {action:'clear_transactions'}),
};
