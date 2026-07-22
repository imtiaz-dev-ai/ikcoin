const el   = id => document.getElementById(id);
const fmt  = (n,d=2) => Number(n).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
const fmtB = n => { n=parseFloat(n)||0; if(n>=1e6) return '$'+fmt(n/1e6,2)+'M'; if(n>=1e3) return '$'+fmt(n/1e3,1)+'K'; return '$'+fmt(n,2); };
const fmtDate = s => s ? new Date(s).toLocaleString('en-PK',{dateStyle:'short',timeStyle:'short'}) : '—';

// ── ADMIN AUTH ────────────────────────────────────────────────────────────
const ADMIN_USER = 'ikcoin_admin';
const ADMIN_PASS = 'IK@2025#secure';

function adminLogin() {
    const u = el('adminUser').value.trim();
    const p = el('adminPass').value;
    if(u === ADMIN_USER && p === ADMIN_PASS) {
        sessionStorage.setItem('adm_auth','1');
        el('adminLoginScreen').style.display='none';
        document.querySelectorAll('.adm-header,.adm-content,.adm-nav').forEach(e=>e.style.visibility='visible');
    } else {
        el('adminLoginErr').textContent='❌ Wrong username or password';
        setTimeout(()=>el('adminLoginErr').textContent='', 3000);
    }
}

function checkAdminAuth() {
    if(sessionStorage.getItem('adm_auth')!=='1') {
        document.querySelectorAll('.adm-header,.adm-content,.adm-nav').forEach(e=>e.style.visibility='hidden');
    } else {
        el('adminLoginScreen').style.display='none';
    }
}

function showToast(msg) {
    const t=el('admToast'); t.textContent=msg; t.classList.remove('hidden');
    setTimeout(()=>t.classList.add('hidden'), 2500);
}
function msg(id, text, ok=true) {
    const e=el(id); if(!e) return;
    e.textContent=text; e.style.color=ok?'#22c55e':'#ef4444';
    setTimeout(()=>e.textContent='', 3000);
}

// ── NAVIGATION ────────────────────────────────────────────────────────────
function showSection(name) {
    document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
    document.querySelectorAll('.anav-btn').forEach(b=>b.classList.remove('active'));
    el('sec-'+name)?.classList.add('active');
    el('anav-'+name)?.classList.add('active');
    if(name==='users')        loadUsers();
    if(name==='transactions') loadTx();
    if(name==='claims')       loadClaims();
    if(name==='deposits')     loadDeposits();
    if(name==='withdrawals')  loadWithdrawals();
    if(name==='support')      loadTickets();
    if(name==='logs')         loadLogs();
}

// ── BOOT ──────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
    checkAdminAuth();
    injectSections();
    await loadSettings();
    await loadStats();
    await loadDashTx();
    await loadClaims();
});

// ── SETTINGS ──────────────────────────────────────────────────────────────
async function loadSettings() {
    try {
        const s = await DB.adminGetSettings();
        const map = {
            aPrice:'price', aSupply:'supply', aHolders:'holders', aNetwork:'network',
            aFee:'fee', aRefPct:'refSellPct', aBinanceId:'binanceId',
            tToken:'tToken', tProd:'tProd', tProgress:'tProgress', tOther:'tOther', tReserve:'tReserve',
            r1t:'r1title', r1d:'r1desc', r2t:'r2title', r2d:'r2desc',
            r3t:'r3title', r3d:'r3desc', r4t:'r4title', r4d:'r4desc'
        };
        Object.entries(map).forEach(([id,key])=>{ const e=el(id); if(e&&s[key]) e.value=s[key]; });
        if(s.price) {
            if(el('quickPrice')) el('quickPrice').value=s.price;
            if(el('currentPriceDisplay')) el('currentPriceDisplay').textContent='$'+parseFloat(s.price).toFixed(6);
        }
    } catch(e) {}
}

// ── STATS ─────────────────────────────────────────────────────────────────
async function loadStats() {
    try {
        const s = await DB.adminGetStats();
        if(el('asTotalBuy'))      el('asTotalBuy').textContent      = fmtB(s.buy_volume);
        if(el('asTotalSell'))     el('asTotalSell').textContent     = fmtB(s.sell_volume);
        if(el('asTxCount'))       el('asTxCount').textContent       = s.tx_count;
        if(el('asTotalFees'))     el('asTotalFees').textContent     = fmtB(s.fees_collected);
        if(el('txCountBadge'))    el('txCountBadge').textContent    = s.tx_count+' total';
        const pd = s.pending_deposits||0, pw = s.pending_withdrawals||0, ot = s.open_tickets||0;
        if(el('pendingDepCount')) el('pendingDepCount').textContent = pd;
        if(el('pendingWitCount')) el('pendingWitCount').textContent = pw;
        if(el('openTicketsCount'))el('openTicketsCount').textContent= ot;
        // nav badges
        setBadge('badge-deposits',   pd);
        setBadge('badge-withdrawals', pw);
        setBadge('badge-support',    ot);
    } catch(e) {}
}
function setBadge(id, n) {
    const b = el(id); if(!b) return;
    if(n > 0){ b.textContent = n > 99 ? '99+' : n; b.classList.remove('hidden'); }
    else b.classList.add('hidden');
}

// ── TX CARD HTML ──────────────────────────────────────────────────────────
function txCardHTML(t) {
    const colors={BUY:'rgba(34,197,94,.15)',SELL:'rgba(239,68,68,.15)',DEPOSIT:'rgba(245,197,24,.15)',SHARE:'rgba(6,182,212,.15)'};
    const icons ={BUY:'fa-circle-plus',SELL:'fa-circle-minus',DEPOSIT:'fa-arrow-down',SHARE:'fa-paper-plane'};
    const tclr  ={BUY:'#22c55e',SELL:'#ef4444',DEPOSIT:'#f5c518',SHARE:'#06b6d4'};
    const c=tclr[t.type]||'#9ca3af';
    return `<div class="tx-card">
        <div class="txc-left">
            <div class="txc-icon" style="background:${colors[t.type]||'rgba(255,255,255,.08)'}">
                <i class="fa-solid ${icons[t.type]||'fa-circle'}" style="color:${c}"></i>
            </div>
            <div>
                <div class="txc-type"><span class="badge badge-${(t.type||'').toLowerCase()}">${t.type}</span></div>
                <div class="txc-email">${t.email||'—'}</div>
                <div class="txc-time">${fmtDate(t.created_at)}</div>
            </div>
        </div>
        <div class="txc-right">
            <div class="txc-cc" style="color:${c}">${t.type==='SELL'||t.type==='SHARE'?'−':'+'}${fmt(t.cc,2)} IK</div>
            <div class="txc-usd">$${fmt(t.usd,2)}</div>
        </div>
    </div>`;
}

async function loadDashTx() {
    try {
        const txs=await DB.adminGetTxns();
        const wrap=el('dashTxCards'); if(!wrap) return;
        if(!txs.length){ wrap.innerHTML='<div style="text-align:center;padding:24px;color:#374151;font-size:.82rem">No transactions yet</div>'; return; }
        wrap.innerHTML=txs.slice(0,10).map(txCardHTML).join('');
    } catch(e) {}
}

async function loadTx() {
    try {
        const txs=await DB.adminGetTxns();
        const wrap=el('allTxCards'); if(!wrap) return;
        if(!txs.length){ wrap.innerHTML='<div style="text-align:center;padding:24px;color:#374151;font-size:.82rem">No transactions yet</div>'; return; }
        wrap.innerHTML=txs.map(txCardHTML).join('');
    } catch(e) {}
}

async function clearTx() {
    if(!confirm('Sari transactions delete karo?')) return;
    try {
        await DB.adminClearTxns();
        loadTx(); loadStats(); loadDashTx();
        showToast('🗑️ Transactions cleared');
    } catch(e) { showToast('⚠️ Error: '+e.message); }
}

// ── USERS ─────────────────────────────────────────────────────────────────
async function loadUsers() {
    try {
        const data=await DB.adminGetUsers();
        const arr=data.users||[], stats=data.stats||{};
        if(el('totalUsersCount'))  el('totalUsersCount').textContent  = stats.total||arr.length;
        if(el('activeUsersCount')) el('activeUsersCount').textContent = stats.active||0;
        if(el('refUsersCount'))    el('refUsersCount').textContent    = stats.referred||0;
        const wrap=el('userList'); if(!wrap) return;
        if(!arr.length){ wrap.innerHTML='<div style="text-align:center;padding:32px;color:#374151;font-size:.82rem">No users yet</div>'; return; }
        const sc={active:'var(--green)',suspended:'var(--orange)',banned:'var(--red)'};
        wrap.innerHTML=arr.map(u=>`
            <div class="user-item">
                <div class="ui-top">
                    <div class="ui-avatar">${(u.name||'U')[0].toUpperCase()}</div>
                    <div style="flex:1">
                        <div class="ui-name">${u.name||'—'}</div>
                        <div class="ui-email">${u.email}</div>
                    </div>
                    <span class="status-badge status-${u.status==='banned'?'rejected':u.status==='suspended'?'pending':'approved'}">${(u.status||'active').toUpperCase()}</span>
                </div>
                <div class="ui-bottom">
                    <div><div class="ui-bal">${fmt(parseFloat(u.wallet_cc||0),2)} IK</div><div class="ui-ref">📞 ${u.phone||'—'}</div></div>
                    <div style="text-align:right"><div class="ui-ref">🔑 ${u.referral_code||'—'}</div><div class="ui-date">📅 ${fmtDate(u.created_at)}</div></div>
                </div>
                <div class="ui-actions">
                    <button class="ui-btn active" onclick="setUserStatus('${u.email}','active')">✅ Active</button>
                    <button class="ui-btn suspend" onclick="setUserStatus('${u.email}','suspended')">⚠️ Suspend</button>
                    <button class="ui-btn ban" onclick="setUserStatus('${u.email}','banned')">🚫 Ban</button>
                </div>
            </div>`).join('');
    } catch(e) {}
}

async function setUserStatus(email, status) {
    try {
        await DB.adminSetStatus(email, status);
        showToast(`✅ ${email} → ${status}`);
        loadUsers();
    } catch(e) { showToast('⚠️ '+e.message); }
}

// ── QUICK PRICE ───────────────────────────────────────────────────────────
async function quickSavePrice() {
    const v=el('quickPrice')?.value;
    if(!v||isNaN(v)||parseFloat(v)<=0){ msg('quickPriceMsg','⚠️ Valid price daalo',false); return; }
    try {
        await DB.adminSaveSettings({price:v});
        if(el('currentPriceDisplay')) el('currentPriceDisplay').textContent='$'+parseFloat(v).toFixed(6);
        if(el('aPrice')) el('aPrice').value=v;
        msg('quickPriceMsg','✅ Price updated!');
        showToast('💰 Price updated!');
    } catch(e) { msg('quickPriceMsg','⚠️ Error',false); }
}

// ── SAVE COIN ─────────────────────────────────────────────────────────────
async function saveCoin() {
    const settings={};
    [['aPrice','price'],['aSupply','supply'],['aHolders','holders'],['aNetwork','network'],['aFee','fee'],['aRefPct','refSellPct'],['aBinanceId','binanceId']]
        .forEach(([id,k])=>{ const v=el(id)?.value; if(v) settings[k]=v; });
    try {
        await DB.adminSaveSettings(settings);
        if(settings.price){ if(el('quickPrice')) el('quickPrice').value=settings.price; if(el('currentPriceDisplay')) el('currentPriceDisplay').textContent='$'+parseFloat(settings.price).toFixed(6); }
        msg('coinMsg','✅ Settings saved!'); showToast('✅ Settings saved!');
    } catch(e) { msg('coinMsg','⚠️ Error',false); }
}

async function saveTokenomics() {
    const settings={};
    [['tToken','tToken'],['tProd','tProd'],['tProgress','tProgress'],['tOther','tOther'],['tReserve','tReserve']]
        .forEach(([id,k])=>{ const v=el(id)?.value; if(v) settings[k]=v; });
    try { await DB.adminSaveSettings(settings); msg('tokenMsg','✅ Tokenomics saved!'); showToast('✅ Tokenomics saved!'); } catch(e) {}
}

async function saveRoadmap() {
    const settings={};
    [['r1t','r1title'],['r1d','r1desc'],['r2t','r2title'],['r2d','r2desc'],['r3t','r3title'],['r3d','r3desc'],['r4t','r4title'],['r4d','r4desc']]
        .forEach(([id,k])=>{ const v=el(id)?.value; if(v) settings[k]=v; });
    try { await DB.adminSaveSettings(settings); msg('roadMsg','✅ Roadmap saved!'); showToast('✅ Roadmap saved!'); } catch(e) {}
}

// ── CLAIMS ────────────────────────────────────────────────────────────────
async function loadClaims() {
    try {
        const claims=await DB.adminGetClaims();
        if(el('claimsCountBadge')) el('claimsCountBadge').textContent=claims.length+' claims';
        const wrap=el('claimsList'); if(!wrap) return;
        if(!claims.length){ wrap.innerHTML='<div style="text-align:center;padding:32px;color:#374151;font-size:.82rem">No claims yet</div>'; return; }
        wrap.innerHTML=claims.map(c=>`
            <div class="claim-card">
                <div>
                    <div class="cc-name">${c.name||'—'}</div>
                    <div class="cc-email">${c.email}</div>
                    <div class="cc-phone">📞 ${c.phone||'—'}</div>
                    <div class="cc-time">🕐 ${fmtDate(c.created_at)}</div>
                </div>
                <div class="cc-badge">Pending</div>
            </div>`).join('');
    } catch(e) {}
}

// ── DEPOSITS ──────────────────────────────────────────────────────────────
async function loadDeposits() {
    try {
        const all=await DB.adminGetDeposits();
        const wrap=el('depositsList'); if(!wrap) return;
        if(!all.length){ wrap.innerHTML='<div style="text-align:center;padding:32px;color:#374151;font-size:.82rem">No deposit requests</div>'; return; }
        wrap.innerHTML=all.map(r=>`
            <div class="req-card">
                <div class="req-top">
                    <div>
                        <div class="req-email">${r.email}</div>
                        <div class="req-detail">💵 $${fmt(r.amount_usd,2)} &nbsp;|&nbsp; TxID: ${r.txid}</div>
                        <div class="req-time">🕐 ${fmtDate(r.created_at)}</div>
                    </div>
                    <span class="status-badge status-${r.status||'pending'}">${r.status||'pending'}</span>
                </div>
                ${r.status==='pending'?`
                <div class="req-actions">
                    <button class="approve-btn" onclick="approveDeposit(${r.id})">✅ Approve</button>
                    <button class="reject-btn"  onclick="rejectDeposit(${r.id})">❌ Reject</button>
                </div>`:''}
            </div>`).join('');
    } catch(e) {}
}

async function approveDeposit(id) {
    try { await DB.adminDepositAction(id,'approve'); showToast('✅ Deposit approved!'); loadDeposits(); loadStats(); loadDashTx(); }
    catch(e) { showToast('⚠️ '+e.message); }
}
async function rejectDeposit(id) {
    try { await DB.adminDepositAction(id,'reject'); showToast('❌ Deposit rejected'); loadDeposits(); }
    catch(e) { showToast('⚠️ '+e.message); }
}

// ── WITHDRAWALS ───────────────────────────────────────────────────────────
async function loadWithdrawals() {
    try {
        const all=await DB.adminGetWithdrawals();
        const wrap=el('withdrawalsList'); if(!wrap) return;
        if(!all.length){ wrap.innerHTML='<div style="text-align:center;padding:32px;color:#374151;font-size:.82rem">No withdrawal requests</div>'; return; }
        wrap.innerHTML=all.map(r=>`
            <div class="req-card">
                <div class="req-top">
                    <div>
                        <div class="req-email">${r.email}</div>
                        <div class="req-detail">🪙 ${fmt(r.amount_cc,2)} IK &nbsp;|&nbsp; $${fmt(r.amount_usd,2)} &nbsp;|&nbsp; Binance: ${r.binance_id}</div>
                        <div class="req-time">🕐 ${fmtDate(r.created_at)}</div>
                    </div>
                    <span class="status-badge status-${r.status||'pending'}">${r.status||'pending'}</span>
                </div>
                ${r.status==='pending'?`
                <div class="req-actions">
                    <button class="approve-btn" onclick="approveWithdrawal(${r.id})">✅ Approve</button>
                    <button class="reject-btn"  onclick="rejectWithdrawal(${r.id})">❌ Reject</button>
                </div>`:''}
            </div>`).join('');
    } catch(e) {}
}

async function approveWithdrawal(id) {
    try { await DB.adminWithdrawAction(id,'approve'); showToast('✅ Withdrawal approved!'); loadWithdrawals(); loadStats(); }
    catch(e) { showToast('⚠️ '+e.message); }
}
async function rejectWithdrawal(id) {
    try { await DB.adminWithdrawAction(id,'reject'); showToast('❌ Withdrawal rejected, balance refunded'); loadWithdrawals(); }
    catch(e) { showToast('⚠️ '+e.message); }
}

// ── SUPPORT TICKETS ───────────────────────────────────────────────────────
async function loadTickets() {
    try {
        const all=await DB.adminGetTickets();
        const wrap=el('ticketsList'); if(!wrap) return;
        if(!all.length){ wrap.innerHTML='<div style="text-align:center;padding:32px;color:#374151;font-size:.82rem">No tickets yet</div>'; return; }
        wrap.innerHTML=all.map(t=>{
            const replies=(t.replies||[]).map(r=>`<div class="reply-item ${r.sender==='admin'?'reply-admin':'reply-user'}"><strong>${r.sender==='admin'?'👨💼 Admin':'👤 User'}:</strong> ${r.message}<br/><span style="font-size:.65rem;color:#4b5563">${fmtDate(r.created_at)}</span></div>`).join('');
            return `<div class="ticket-card">
                <div style="display:flex;justify-content:space-between;align-items:flex-start">
                    <div><div class="ticket-subject">${t.subject}</div><div class="ticket-email">${t.email} &nbsp;|&nbsp; 🕐 ${fmtDate(t.created_at)}</div></div>
                    <span class="status-badge status-${t.status==='closed'?'rejected':t.status==='replied'?'approved':'pending'}">${t.status||'open'}</span>
                </div>
                <div class="ticket-msg">${t.message}</div>
                ${replies?`<div style="margin-top:4px">${replies}</div>`:''}
                ${t.status!=='closed'?`
                <div class="reply-wrap">
                    <textarea id="reply_${t.id}" placeholder="Admin reply likhein..."></textarea>
                    <button class="reply-send-btn" onclick="adminReply(${t.id},'${t.email}')"><i class="fa-solid fa-paper-plane"></i></button>
                </div>
                <button class="reject-btn" style="width:100%;margin-top:4px" onclick="closeTicket(${t.id},'${t.email}')">🔒 Close Ticket</button>`:''}
            </div>`;
        }).join('');
    } catch(e) {}
}

async function adminReply(ticketId, email) {
    const txt=el('reply_'+ticketId)?.value.trim(); if(!txt) return;
    try { await DB.adminTicketReply(ticketId, txt, email); showToast('💬 Reply sent!'); loadTickets(); }
    catch(e) { showToast('⚠️ '+e.message); }
}
async function closeTicket(ticketId, email) {
    try { await DB.adminCloseTicket(ticketId, email); showToast('🔒 Ticket closed'); loadTickets(); }
    catch(e) { showToast('⚠️ '+e.message); }
}

// ── LOGS ──────────────────────────────────────────────────────────────────
async function loadLogs() {
    try {
        const logs=await DB.adminGetLogs();
        const wrap=el('logsList'); if(!wrap) return;
        if(!logs.length){ wrap.innerHTML='<div style="text-align:center;padding:32px;color:#374151;font-size:.82rem">No activity yet</div>'; return; }
        wrap.innerHTML=logs.map(l=>`
            <div class="log-item">
                <div class="log-dot"></div>
                <div style="flex:1">
                    <div class="log-action">${l.action}</div>
                    ${l.detail?`<div class="log-detail">${l.detail}</div>`:''}
                </div>
                <div class="log-time">${fmtDate(l.created_at)}</div>
            </div>`).join('');
    } catch(e) {}
}
