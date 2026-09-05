// ── PRICE STATE ───────────────────────────────────────────────────────────
let adminPrice = 0.01;
let price      = 0.01;
let open       = 0.01;
let high24     = 0.0105;
let low24      = 0.0095;
let hist       = [];
let mChart     = null;

// ── NAVIGATION ────────────────────────────────────────────────────────────
function showPage(name) {
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
    el('page-'+name)?.classList.add('active');
    el('nav-'+name)?.classList.add('active');
    if(name==='wallet')  renderWallet();
    if(name==='team')    renderTeamPage();
    if(name==='profile') renderSurpriseCard();
}

// ── PRICE TICK ────────────────────────────────────────────────────────────
function tick() {
    const drift = adminPrice * 0.0002;
    price = Math.max(0.0001, price + (Math.random()-.48)*drift);
    if(price > high24) high24 = price;
    if(price < low24)  low24  = price;
    hist.push(price); if(hist.length>80) hist.shift();
    const chgPct = ((price-open)/open)*100, up = chgPct>=0;
    if(el('homePrice'))       el('homePrice').textContent       = fmtP(price);
    if(el('homeBadge'))     { el('homeBadge').textContent       = pct(chgPct); el('homeBadge').className='price-badge '+(up?'green':'red'); }
    if(el('mcChange'))      { el('mcChange').textContent        = pct(chgPct); el('mcChange').className=up?'green':'red'; }
    if(el('tradeLivePrice'))  el('tradeLivePrice').textContent  = fmtP(price);
    if(el('tradeLiveChange')){ el('tradeLiveChange').textContent= pct(chgPct); el('tradeLiveChange').className='tpb-change '+(up?'green':'red'); }
    if(el('tradeHigh'))       el('tradeHigh').textContent       = fmtP(high24);
    if(el('tradeLow'))        el('tradeLow').textContent        = fmtP(low24);
    updateChart(); mCalcBuy(); mCalcSell();
}

// ── CHART ─────────────────────────────────────────────────────────────────
function buildChart() {
    const cv=el('miniChart'); if(!cv) return;
    cv.style.maxHeight='65px';
    const chg=((price-open)/open)*100, col=chg>=0?'#22c55e':'#ef4444';
    const ctx=cv.getContext('2d'), g=ctx.createLinearGradient(0,0,0,65);
    g.addColorStop(0,chg>=0?'rgba(34,197,94,.25)':'rgba(239,68,68,.25)'); g.addColorStop(1,'rgba(0,0,0,0)');
    mChart=new Chart(cv,{type:'line',data:{labels:hist.map((_,i)=>i),datasets:[{data:[...hist],borderColor:col,borderWidth:1.5,pointRadius:0,tension:.4,fill:true,backgroundColor:g}]},options:{responsive:true,maintainAspectRatio:false,animation:false,plugins:{legend:{display:false},tooltip:{enabled:false}},scales:{x:{display:false},y:{display:false}}}});
}
function updateChart() {
    if(!mChart) return;
    mChart.data.labels=hist.map((_,i)=>i);
    mChart.data.datasets[0].data=[...hist];
    mChart.update('none');
}

// ── MARKET TICKER ─────────────────────────────────────────────────────────
async function fetchMarket() {
    try {
        const r=await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=8&page=1&sparkline=false');
        if(!r.ok) throw new Error();
        renderTicker(await r.json());
    } catch(e) {
        renderTicker([
            {name:'Bitcoin', symbol:'btc',current_price:67420,price_change_percentage_24h:2.34,image:'https://assets.coingecko.com/coins/images/1/large/bitcoin.png'},
            {name:'Ethereum',symbol:'eth',current_price:3520, price_change_percentage_24h:1.87,image:'https://assets.coingecko.com/coins/images/279/large/ethereum.png'},
            {name:'BNB',     symbol:'bnb',current_price:598,  price_change_percentage_24h:-0.54,image:'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png'},
            {name:'Solana',  symbol:'sol',current_price:178,  price_change_percentage_24h:3.21,image:'https://assets.coingecko.com/coins/images/4128/large/solana.png'},
        ]);
    }
}
function renderTicker(data) {
    const w=el('homeTicker'); if(!w) return;
    w.innerHTML=data.map(c=>{ const chg=c.price_change_percentage_24h||0; return `<div class="ticker-item"><div class="ti-left"><img class="ti-img" src="${c.image}" onerror="this.style.display='none'" alt=""/><div><div class="ti-name">${c.name}</div><div class="ti-sym">${c.symbol.toUpperCase()}</div></div></div><div class="ti-right"><div class="ti-price">${fmtP(c.current_price)}</div><div class="ti-chg ${chg>=0?'green':'red'}">${pct(chg)}</div></div></div>`; }).join('');
}

// ── SURPRISE REWARD ───────────────────────────────────────────────────────
const SURPRISE_TARGET = 1000000;

async function renderSurpriseCard() {
    if(!currentUser) return;
    try {
        const data = await DB.getUser(currentUser.email);
        const txs  = (data.transactions||[]).filter(t=>t.type==='SELL');
        const sold = txs.reduce((s,t)=>s+parseFloat(t.cc||0),0);
        const p    = Math.min(100,(sold/SURPRISE_TARGET)*100);
        const done = sold >= SURPRISE_TARGET;
        if(el('surpriseFill'))   el('surpriseFill').style.width = p.toFixed(2)+'%';
        if(el('surpriseSold'))   el('surpriseSold').textContent = fmt(sold,0)+' IK sold';
        const status = el('surpriseStatus');
        if(status) {
            if(done && !currentUser.surprise_claimed) {
                status.innerHTML=`<div class="surprise-done">🎉 Mubarak! 1M IK sell complete!<button class="surprise-claim-btn" onclick="claimSurprise()">🎁 Claim Surprise Reward</button></div>`;
            } else if(done && currentUser.surprise_claimed) {
                status.innerHTML='<div class="surprise-claimed">✅ Reward claimed! Team aapse contact karega.</div>';
            } else {
                status.innerHTML=`<div class="surprise-remaining">🔥 ${fmt(SURPRISE_TARGET-sold,0)} IK aur sell karo!</div>`;
            }
        }
    } catch(e) {}
}

async function claimSurprise() {
    try {
        await DB.claimSurprise(currentUser.email);
        currentUser.surprise_claimed = 1;
        renderSurpriseCard();
        showToast('🎁 Reward claim ho gaya! Team 24h mein contact karegi.');
    } catch(e) { showToast('⚠️ '+e.message); }
}

// ── AVATAR ────────────────────────────────────────────────────────────────
function triggerAvatarUpload() { el('avatarInput').click(); }
function handleAvatarUpload(e) {
    const file=e.target.files[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=async function(ev) {
        const url=ev.target.result;
        currentUser.avatar_url=url;
        applyAvatar(url);
        try { await DB.updateAvatar(currentUser.email, url); } catch(e2){}
        showToast('✅ Profile photo updated!');
    };
    reader.readAsDataURL(file);
}
function applyAvatar(url) {
    const img=el('profileAvatarImg'), icon=el('profileAvatarIcon');
    const hBtn=el('headerProfileBtn'), hIcon=el('headerProfileIcon');
    if(url) {
        if(img)  { img.src=url; img.style.display='block'; }
        if(icon)  icon.style.display='none';
        if(hBtn) { hBtn.style.backgroundImage=`url(${url})`; hBtn.style.backgroundSize='cover'; hBtn.style.backgroundPosition='center'; if(hIcon) hIcon.style.display='none'; }
    } else {
        if(img)  { img.src=''; img.style.display='none'; }
        if(icon)  icon.style.display='';
        if(hBtn)  hBtn.style.backgroundImage='';
        if(hIcon) hIcon.style.display='';
    }
}

// ── REFERRAL ──────────────────────────────────────────────────────────────
function getMyReferralLink() {
    return window.location.href.split('?')[0]+'?ref='+(currentUser?.referral_code||'');
}
function copyReferralLink() {
    navigator.clipboard?.writeText(getMyReferralLink()).then(()=>showToast('🔗 Referral link copied!')).catch(()=>prompt('Copy:',getMyReferralLink()));
}
function shareReferralLink() {
    const link=getMyReferralLink(), text='🚀 Join IK Coin Wallet & get FREE IK coins!\n\n'+link;
    if(navigator.share) navigator.share({title:'IK Coin Wallet',text,url:link});
    else copyReferralLink();
}

async function renderTeamPage() {
    if(!currentUser) return;
    if(el('refCode'))  el('refCode').textContent  = currentUser.referral_code||'—';
    if(el('refLink'))  el('refLink').value         = getMyReferralLink();
    try {
        const data = await DB.getUser(currentUser.email);
        const refs = data.referrals||[];
        if(el('refTotal'))  el('refTotal').textContent  = refs.length;
        if(el('refEarned')) el('refEarned').textContent = fmt(parseFloat(currentUser.ref_earned||0),2)+' IK';
        const list=el('refList'); if(!list) return;
        if(!refs.length) {
            list.innerHTML=`<div class="empty-state"><i class="fa-solid fa-user-plus"></i><p>Abhi koi referral nahi.<br/>Apna link share karo!</p></div>`;
            return;
        }
        list.innerHTML=refs.map(r=>`
            <div class="ref-item">
                <div class="ref-avatar"><i class="fa-solid fa-user"></i></div>
                <div class="ref-info">
                    <div class="ref-name">${r.name||r.ref_email}</div>
                    <div class="ref-email">${r.ref_email||r.referred_email}</div>
                    <div class="ref-date">Joined: ${new Date(r.created_at).toLocaleDateString()}</div>
                </div>
                <div class="ref-bonus ${r.has_bought?'green':'orange'}">
                    +${fmt(parseFloat(r.total_earned||0),2)} IK
                    <div style="font-size:.65rem;color:#6b7280">${r.has_bought?'✅ Commission':'⏳ Joined'}</div>
                </div>
            </div>`).join('');
    } catch(e) {}
}

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────
async function updateNotifBadge() {
    if(!currentUser) return;
    try {
        const data  = await DB.getUser(currentUser.email);
        const unread = data.unread||0;
        const badge  = el('notifBadge');
        if(badge) { badge.textContent=unread; badge.style.display=unread?'flex':'none'; }
    } catch(e) {}
}

async function openNotifications() {
    const m=el('notifModal'); if(!m) return;
    m.classList.remove('hidden');
    try {
        const data   = await DB.getUser(currentUser.email);
        const notifs = data.notifications||[];
        await DB.markNotifsRead(currentUser.email);
        const badge=el('notifBadge'); if(badge) badge.style.display='none';
        const list=el('notifList'); if(!list) return;
        if(!notifs.length) { list.innerHTML='<div style="text-align:center;padding:24px;color:#6b7280;font-size:.82rem">Koi notification nahi</div>'; return; }
        const clr={info:'#06b6d4',success:'#22c55e',warning:'#f59e0b',error:'#ef4444'};
        list.innerHTML=notifs.map(n=>`
            <div style="background:#111827;border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:12px;margin-bottom:8px">
                <div style="font-size:.84rem;font-weight:700;color:${clr[n.type]||'#fff'}">${n.title}</div>
                <div style="font-size:.78rem;color:#9ca3af;margin-top:4px">${n.body}</div>
                <div style="font-size:.65rem;color:#4b5563;margin-top:5px">🕐 ${new Date(n.created_at).toLocaleString()}</div>
            </div>`).join('');
    } catch(e) {}
}

// ── SUPPORT TICKETS ───────────────────────────────────────────────────────
function openSupportModal() { el('supportModal')?.classList.remove('hidden'); }
async function submitTicket() {
    const subject = el('ticketSubject')?.value.trim();
    const message = el('ticketMessage')?.value.trim();
    if(!subject) { showToast('⚠️ Subject daalo'); return; }
    if(!message) { showToast('⚠️ Message daalo'); return; }
    try {
        await DB.submitTicket(currentUser.email, subject, message);
        el('ticketSubject').value=''; el('ticketMessage').value='';
        closeModal('supportModal');
        showToast('🎫 Ticket submit ho gaya!');
    } catch(e) { showToast('⚠️ '+e.message); }
}

async function openMyTickets() {
    const m=el('myTicketsModal'); if(!m) return;
    m.classList.remove('hidden');
    const list=el('myTicketsList'); if(!list) return;
    try {
        const tickets = await DB.getMyTickets(currentUser.email);
        if(!tickets.length) { list.innerHTML='<div style="text-align:center;padding:24px;color:#6b7280;font-size:.82rem">Koi ticket nahi abhi</div>'; return; }
        const clr={closed:'#ef4444',replied:'#22c55e',open:'#f5c518'};
        list.innerHTML=tickets.map(t=>{
            const replies=(t.replies||[]).map(r=>`
                <div style="padding:8px 10px;border-radius:8px;margin-top:6px;font-size:.78rem;${r.sender==='admin'?'background:rgba(245,197,24,.08);border:1px solid rgba(245,197,24,.15)':'background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)'}">
                    <strong>${r.sender==='admin'?'👨‍💼 Admin':'👤 You'}:</strong> ${r.message}
                    <div style="font-size:.65rem;color:#4b5563;margin-top:3px">${new Date(r.created_at).toLocaleString()}</div>
                </div>`).join('');
            return `<div style="background:#111827;border:1px solid rgba(245,197,24,.15);border-radius:14px;padding:13px;margin-bottom:10px">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
                    <div style="font-size:.86rem;font-weight:700">${t.subject}</div>
                    <span style="font-size:.68rem;font-weight:700;color:${clr[t.status]||'#f5c518'}">${t.status.toUpperCase()}</span>
                </div>
                <div style="font-size:.78rem;color:#9ca3af">${t.message}</div>
                ${replies}
                <div style="font-size:.65rem;color:#4b5563;margin-top:6px">🕐 ${new Date(t.created_at).toLocaleString()}</div>
            </div>`;
        }).join('');
    } catch(e) { list.innerHTML='<div style="text-align:center;padding:24px;color:#6b7280">Error loading tickets</div>'; }
}

// ── TOAST ─────────────────────────────────────────────────────────────────
function showToast(msg) {
    const t=el('mToast'); t.textContent=msg; t.classList.remove('hidden');
    setTimeout(()=>t.classList.add('hidden'), 2500);
}

// ── INIT APP ──────────────────────────────────────────────────────────────
async function initApp() {
    // Load settings
    try {
        const s = await DB.adminGetSettings();
        adminPrice = parseFloat(s.price||0.01);
        price = adminPrice; open = price; high24 = price*1.05; low24 = price*0.95;
        const supply = parseFloat(s.supply||500000000);
        if(el('totalCoins'))  el('totalCoins').textContent  = fmt(supply,0);
        if(el('teamHolders')) el('teamHolders').textContent = Number(s.holders||12450).toLocaleString();
        if(el('remainCoins')) el('remainCoins').textContent = fmt(supply-1369.56,0);
        if(el('usedCoins'))   el('usedCoins').textContent   = fmt(1369.56,2);
        if(el('binanceIdDisplay')) el('binanceIdDisplay').textContent = s.binanceId||'123456789';
        if(el('depBinanceId'))     el('depBinanceId').textContent     = s.binanceId||'123456789';
    } catch(e) {}

    // Load user data
    try {
        const data = await DB.getUser(currentUser.email);
        currentUser  = data.user;
        walletCC     = parseFloat(currentUser.wallet_cc||0);
    } catch(e) {}

    // Profile UI
    if(el('profileName'))    el('profileName').textContent    = currentUser.name||'';
    if(el('profileEmail'))   el('profileEmail').textContent   = currentUser.email||'';
    if(el('profilePhone'))   el('profilePhone').textContent   = currentUser.phone||'';
    if(el('profileUserId'))  el('profileUserId').textContent  = currentUser.user_id ? '🪪 '+currentUser.user_id : '';
    applyAvatar(currentUser.avatar_url||null);

    // Price history seed
    for(let i=0;i<60;i++){ price=Math.max(0.0001,price+(Math.random()-.48)*adminPrice*0.0002); hist.push(price); }
    open=hist[0]; high24=Math.max(...hist)*1.01; low24=Math.min(...hist)*.99;

    tick(); buildChart();
    setInterval(tick, 2000);
    fetchMarket(); setInterval(fetchMarket, 30000);
    updateNotifBadge();
    renderTeamPage();
}

// ── BOOT ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    checkReferralOnBoot();
    const savedEmail = localStorage.getItem('ccCurrentUser');
    if(savedEmail) {
        try {
            const data = await DB.getUser(savedEmail);
            if(data.user) {
                currentUser = data.user;
                walletCC    = parseFloat(currentUser.wallet_cc||0);
                el('authScreen').classList.add('hidden');
                el('mainApp').classList.remove('hidden');
                initApp(); return;
            }
        } catch(e) {}
    }
    showLogin();
});
