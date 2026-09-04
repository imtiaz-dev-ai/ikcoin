// ── EMAILJS CONFIG ───────────────────────────────────────────────────────
// EmailJS se teen cheezein lo: emailjs.com → Account → Public Key
//                                           → Email Services → Service ID
//                                           → Email Templates → Template ID
const EMAILJS_PUBLIC_KEY  = 'vdDOikY44qUJYyR8W';
const EMAILJS_SERVICE_ID  = 'service_bdm0rzu';
const EMAILJS_TEMPLATE_ID = 'template_akxutur';

// ── BINANCE CONFIG ───────────────────────────────────────────────────────
const BINANCE_ID = '123456789'; // Admin apna Binance ID yahan daale

function copyBinanceId() {
  navigator.clipboard?.writeText(BINANCE_ID).then(()=>showToast('📋 Binance ID copied!')).catch(()=>showToast('ID: '+BINANCE_ID));
}
function copyDepBinanceId() { copyBinanceId(); }

// ── REFERRAL CONFIG ──────────────────────────────────────────────────────
const REF_JOIN_BONUS = 50;   // referrer ko jab koi join kare (fixed IK)
const REF_SELF_BONUS = 25;   // naya user khud ko milega SIRF referral link/code se
// REF_BUY_PCT = admin se set hoga (default 10%) — har BUY pe % commission referrer ko

function genRefCode() { return Math.random().toString(36).substr(2,8).toUpperCase(); }
function getRefSellPct() {
  return parseFloat(JSON.parse(localStorage.getItem('ccSettings')||'{}').refSellPct || 10);
}
function getRefBuyPct() {
  return parseFloat(JSON.parse(localStorage.getItem('ccSettings')||'{}').refSellPct || 10);
}

// ── STATE ──────────────────────────────────────────────────────────────────
const S     = JSON.parse(localStorage.getItem('ccSettings') || '{}');
let adminPrice = parseFloat(S.price || 0.01); // admin-set base price
let price   = adminPrice;
let open    = price;
let high24  = price * 1.05;
let low24   = price * 0.95;
let hist    = [];
let mChart  = null;
let walletCC  = 0;
let locked    = true;
let currentUser = null;
let otpCode = '';
let otpEmail = '';
let otpTimer = null;
let pendingTxIds = JSON.parse(localStorage.getItem('pendingTxIds')||'[]');

const el  = id => document.getElementById(id);
const fmt = (n,d=2) => Number(n).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
const fmtP = n => n<1?'$'+fmt(n,6):'$'+fmt(n,2);
const pct  = p => (p>=0?'+':'')+fmt(p,2)+'%';

// ── AUTH ───────────────────────────────────────────────────────────────────
function showLogin()    { el('stepLogin').classList.remove('hidden'); el('stepRegister').classList.add('hidden'); el('stepOTP').classList.add('hidden'); }
function showRegister() {
  el('stepRegister').classList.remove('hidden'); el('stepLogin').classList.add('hidden'); el('stepOTP').classList.add('hidden');
  // URL se ref code auto-fill karo
  const pending = localStorage.getItem('pendingRef');
  if(pending && el('regRefCode')) { el('regRefCode').value = pending; checkRefCode(pending); }
}

function checkRefCode(code) {
  const box = el('refHintBox'); if(!box) return;
  if(!code || code.length < 4) { box.innerHTML=''; return; }
  const users = getUsers();
  const found = Object.values(users).find(u => u.referralCode === code.toUpperCase());
  if(found) {
    box.innerHTML = `<div class="ref-hint-ok">🎁 Valid code! +${REF_SELF_BONUS} IK bonus milega join pe</div>`;
  } else {
    box.innerHTML = `<div class="ref-hint-err">❌ Invalid referral code</div>`;
  }
}

async function sendOTP() {
  const email = el('loginEmail').value.trim();
  if(!email || !email.includes('@')) { showAuthMsg('loginMsg','\u26A0\uFE0F Enter a valid email','error'); return; }
  const users = getUsers();
  if(!users[email]) { showAuthMsg('loginMsg','\u26A0\uFE0F Email not registered. Please register first.','error'); return; }
  otpEmail = email;
  const btn = el('loginEmail').closest('.auth-card').querySelector('.auth-btn');
  btn.textContent = '\u23F3 Sending OTP...';
  btn.disabled = true;
  const ok = await sendRealOTP(email, users[email].name);
  btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send OTP';
  btn.disabled = false;
  if(ok) {
    showAuthMsg('loginMsg','\u2705 OTP sent to '+email,'success');
    setTimeout(()=>{ el('stepLogin').classList.add('hidden'); el('stepOTP').classList.remove('hidden'); el('otpSubText').textContent='OTP sent to: '+email; startOTPTimer(); },800);
  }
}

async function registerUser() {
  const name    = el('regName').value.trim();
  const email   = el('regEmail').value.trim();
  const phone   = el('regPhone').value.trim();
  const refInput = el('regRefCode')?.value.trim().toUpperCase();
  if(!name)  { showAuthMsg('regMsg','⚠️ Enter your name','error'); return; }
  if(!email || !email.includes('@')) { showAuthMsg('regMsg','⚠️ Enter valid email','error'); return; }
  if(!phone) { showAuthMsg('regMsg','⚠️ Enter phone number','error'); return; }
  const users = getUsers();
  if(users[email]) { showAuthMsg('regMsg','⚠️ Email already registered. Login instead.','error'); return; }
  // manual referral code input bhi check karo
  if(refInput && !localStorage.getItem('pendingRef')) {
    localStorage.setItem('pendingRef', refInput);
  }
  users[email] = { name, email, phone, walletCC:0, walletAddr:'IK'+Math.random().toString(36).substr(2,12).toUpperCase(), referralCode: genRefCode(), referrals:[], refEarned:0, joined: new Date().toLocaleDateString() };
  localStorage.setItem('ccUsers', JSON.stringify(users));
  otpEmail = email;
  const btn = el('regEmail').closest('.auth-card').querySelector('.auth-btn');
  btn.textContent = '⏳ Sending OTP...';
  btn.disabled = true;
  const ok = await sendRealOTP(email, name);
  btn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Register & Send OTP';
  btn.disabled = false;
  if(ok) {
    applyReferralOnRegister(email);
    showAuthMsg('regMsg','✅ Registered! OTP sent to '+email,'success');
    setTimeout(()=>{ el('stepRegister').classList.add('hidden'); el('stepOTP').classList.remove('hidden'); el('otpSubText').textContent='OTP sent to: '+email; startOTPTimer(); },800);
  }
}

function generateOTP() {
  otpCode = String(Math.floor(100000 + Math.random()*900000));
  console.log('\uD83D\uDD10 OTP:', otpCode);
}

async function sendRealOTP(email, name) {
  generateOTP();
  // Check if EmailJS is configured
  if(EMAILJS_PUBLIC_KEY === 'YOUR_PUBLIC_KEY') {
    // Demo mode — show OTP in alert
    showToast('Demo OTP: ' + otpCode);
    setTimeout(()=>alert('\uD83D\uDD10 Your OTP (Demo Mode):\n\n' + otpCode + '\n\nSetup EmailJS for real Gmail OTP.'), 300);
    return true;
  }
  try {
    emailjs.init(EMAILJS_PUBLIC_KEY);
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      to_email : email,
      to_name  : name || email.split('@')[0],
      otp_code : otpCode,
      from_name: 'IK Coin Wallet'
    });
    return true;
  } catch(err) {
    console.error('EmailJS error:', err);
    // Fallback: show OTP
    showToast('Email failed. OTP: ' + otpCode);
    return true;
  }
}

function verifyOTP() {
  const entered = ['o1','o2','o3','o4','o5','o6'].map(id=>el(id).value).join('');
  if(entered.length < 6) { showAuthMsg('otpMsg','⚠️ Enter all 6 digits','error'); return; }
  if(entered !== otpCode) { showAuthMsg('otpMsg','❌ Wrong OTP. Try again.','error'); return; }
  clearInterval(otpTimer);
  const users = getUsers();
  currentUser = users[otpEmail];
  walletCC = parseFloat(currentUser.walletCC || 0);
  localStorage.setItem('ccCurrentUser', otpEmail);
  showAuthMsg('otpMsg','✅ Verified! Logging in...','success');
  setTimeout(()=>{ el('authScreen').classList.add('hidden'); el('mainApp').classList.remove('hidden'); initApp(); renderTeamPage(); },700);
}

function otpNext(inp, nextId) {
  inp.value = inp.value.slice(-1);
  if(inp.value && nextId) el(nextId)?.focus();
}

function startOTPTimer() {
  let t = 60;
  el('otpTimer').textContent = t;
  clearInterval(otpTimer);
  otpTimer = setInterval(()=>{ t--; el('otpTimer').textContent=t; if(t<=0) clearInterval(otpTimer); },1000);
}

function showAuthMsg(id, msg, type) {
  const e = el(id); if(!e) return;
  e.textContent = msg; e.className = 'auth-msg '+(type==='error'?'auth-err':'auth-ok');
  setTimeout(()=>e.textContent='',4000);
}

function getUsers() { return JSON.parse(localStorage.getItem('ccUsers')||'{}'); }

function logout() {
  if(!confirm('Logout?')) return;
  localStorage.removeItem('ccCurrentUser');
  currentUser = null; walletCC = 0;
  el('mainApp').classList.add('hidden');
  el('authScreen').classList.remove('hidden');
  showLogin();
}

// ── NAVIGATION ─────────────────────────────────────────────────────────────
function showPage(name) {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  el('page-'+name)?.classList.add('active');
  el('nav-'+name)?.classList.add('active');
  if(name==='wallet') renderWallet();
  if(name==='team') renderTeamPage();
  if(name==='profile') renderSurpriseCard();
}

// ── PRICE TICK ─────────────────────────────────────────────────────────────
function tick() {
  // reload admin price if changed
  const latestAdmin = parseFloat(JSON.parse(localStorage.getItem('ccSettings')||'{}').price || adminPrice);
  if(latestAdmin !== adminPrice) { adminPrice = latestAdmin; price = adminPrice; open = price; high24 = price*1.05; low24 = price*0.95; hist=[]; }
  // small fluctuation around admin price (max ±2%)
  const drift = adminPrice * 0.0002;
  price = Math.max(0.0001, price + (Math.random()-0.48)*drift);
  if(price > high24) high24 = price;
  if(price < low24)  low24  = price;
  hist.push(price); if(hist.length>80) hist.shift();
  const chgPct = ((price-open)/open)*100, up = chgPct>=0;
  if(el('homePrice'))  el('homePrice').textContent  = fmtP(price);
  if(el('homeBadge')){ el('homeBadge').textContent  = pct(chgPct); el('homeBadge').className='price-badge '+(up?'green':'red'); }
  if(el('mcChange')){ el('mcChange').textContent=pct(chgPct); el('mcChange').className=up?'green':'red'; }
  if(el('tradeLivePrice'))  el('tradeLivePrice').textContent  = fmtP(price);
  if(el('tradeLiveChange')){ el('tradeLiveChange').textContent=pct(chgPct); el('tradeLiveChange').className='tpb-change '+(up?'green':'red'); }
  if(el('tradeHigh')) el('tradeHigh').textContent=fmtP(high24);
  if(el('tradeLow'))  el('tradeLow').textContent=fmtP(low24);
  updateChart(); mCalcBuy(); mCalcSell();
}

// ── CHART ──────────────────────────────────────────────────────────────────
function buildChart() {
  const cv=el('miniChart'); if(!cv) return;
  cv.style.maxHeight='65px';
  const chg=((price-open)/open)*100, col=chg>=0?'#22c55e':'#ef4444';
  const ctx=cv.getContext('2d'), g=ctx.createLinearGradient(0,0,0,65);
  g.addColorStop(0,chg>=0?'rgba(34,197,94,.25)':'rgba(239,68,68,.25)'); g.addColorStop(1,'rgba(0,0,0,0)');
  mChart=new Chart(cv,{type:'line',data:{labels:hist.map((_,i)=>i),datasets:[{data:[...hist],borderColor:col,borderWidth:1.5,pointRadius:0,tension:.4,fill:true,backgroundColor:g}]},options:{responsive:true,maintainAspectRatio:false,animation:false,plugins:{legend:{display:false},tooltip:{enabled:false}},scales:{x:{display:false},y:{display:false}}}});
}
function updateChart() { if(!mChart) return; mChart.data.labels=hist.map((_,i)=>i); mChart.data.datasets[0].data=[...hist]; mChart.update('none'); }

// ── MARKET ─────────────────────────────────────────────────────────────────
async function fetchMarket() {
  try {
    const r=await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=8&page=1&sparkline=false');
    if(!r.ok) throw new Error();
    renderTicker(await r.json());
  } catch(e) {
    renderTicker([
      {name:'Bitcoin',  symbol:'btc', current_price:67420, price_change_percentage_24h:2.34,  image:'https://assets.coingecko.com/coins/images/1/large/bitcoin.png'},
      {name:'Ethereum', symbol:'eth', current_price:3520,  price_change_percentage_24h:1.87,  image:'https://assets.coingecko.com/coins/images/279/large/ethereum.png'},
      {name:'BNB',      symbol:'bnb', current_price:598,   price_change_percentage_24h:-0.54, image:'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png'},
      {name:'Solana',   symbol:'sol', current_price:178,   price_change_percentage_24h:3.21,  image:'https://assets.coingecko.com/coins/images/4128/large/solana.png'},
      {name:'XRP',      symbol:'xrp', current_price:0.62,  price_change_percentage_24h:1.10,  image:'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png'},
      {name:'Dogecoin', symbol:'doge',current_price:0.165, price_change_percentage_24h:-1.20, image:'https://assets.coingecko.com/coins/images/5/large/dogecoin.png'},
    ]);
  }
}
function renderTicker(data) {
  const w=el('homeTicker'); if(!w) return;
  w.innerHTML=data.map(c=>{ const chg=c.price_change_percentage_24h||0; return `<div class="ticker-item"><div class="ti-left"><img class="ti-img" src="${c.image}" onerror="this.style.display='none'" alt=""/><div><div class="ti-name">${c.name}</div><div class="ti-sym">${c.symbol.toUpperCase()}</div></div></div><div class="ti-right"><div class="ti-price">${fmtP(c.current_price)}</div><div class="ti-chg ${chg>=0?'green':'red'}">${pct(chg)}</div></div></div>`; }).join('');
}

// ── LOCK ───────────────────────────────────────────────────────────────────
function toggleLock() {
  locked=!locked;
  const btn=el('lockBtn'),icon=el('lockIcon'),txt=el('lockText');
  if(!locked){ btn.classList.add('unlocked'); icon.className='fa-solid fa-lock-open'; txt.textContent='Trading Unlocked'; showToast('🔓 Trading Unlocked!'); }
  else { btn.classList.remove('unlocked'); icon.className='fa-solid fa-lock'; txt.textContent='Tap to Unlock Trading'; showToast('🔒 Trading Locked'); }
}

// ── PAYMENT METHODS ────────────────────────────────────────────────────────
// legacy stubs — not used with Binance-only
function selectPay(){} function selectSellPay(){} function selectDepPay(){}

// ── TRADE CALC ─────────────────────────────────────────────────────────────
function mCalcBuy() {
  const usd=parseFloat(el('mBuyUSDT')?.value)||0;
  const fee=usd*.005, cc=(usd-fee)/price;
  if(el('mBuyPay')) el('mBuyPay').textContent='$'+fmt(usd,2);
  if(el('mBuyFee')) el('mBuyFee').textContent='$'+fmt(fee,4);
  if(el('mBuyGet')) el('mBuyGet').textContent=fmt(cc,2)+' IK';
}
function mCalcSell() {
  const cc=parseFloat(el('mSellCC')?.value)||0;
  const usd=cc*price, fee=usd*.005, net=usd-fee;
  if(el('mSellAmt')) el('mSellAmt').textContent=fmt(cc,2)+' IK';
  if(el('mSellFee')) el('mSellFee').textContent='$'+fmt(fee,4);
  if(el('mSellGet')) el('mSellGet').textContent='$'+fmt(net,2)+' USDT';
}
function mSetQ(id,val,fn){ const i=el(id); if(i){i.value=val;fn();} }

function switchTrade(t) {
  el('tpBuy').classList.toggle('hidden',t!=='buy');
  el('tpSell').classList.toggle('hidden',t!=='sell');
  el('ttBuy').classList.toggle('active',t==='buy');
  el('ttSell').classList.toggle('active',t==='sell');
  el('tradeMsg').classList.add('hidden');
}

function mExecBuy() {
  if(locked){ showTradeMsg('error','🔒 Unlock trading first!'); return; }
  const usd=parseFloat(el('mBuyUSDT')?.value)||0;
  const txid=el('mBuyTxId')?.value.trim();
  if(usd<=0){ showTradeMsg('error','⚠️ Enter USDT amount'); return; }
  if(!txid){ showTradeMsg('error','⚠️ Enter Transaction ID'); return; }
  const fee=usd*.005, cc=(usd-fee)/price;
  walletCC+=cc; saveUserWallet();
  applyReferralOnBuy(currentUser.email, cc); // 10% commission on buy
  saveTx('BUY',cc,usd,fee,'Binance','$'+fmt(usd,2)+' TxID:'+txid);
  el('mBuyUSDT').value=''; el('mBuyTxId').value=''; mCalcBuy();
  showTradeMsg('success',`✅ Bought ${fmt(cc,2)} IK via Binance Pay`);
  showToast('🚀 Purchase successful!');
}
function mExecSell() {
  if(locked){ showTradeMsg('error','🔒 Unlock trading first!'); return; }
  submitWithdrawRequest();
}
function showTradeMsg(type,msg){ const m=el('tradeMsg'); m.textContent=msg; m.className='trade-msg '+type; setTimeout(()=>m.classList.add('hidden'),5000); }

// ── DEPOSIT MODAL ──────────────────────────────────────────────────────────
function openDeposit() { el('depositModal').classList.remove('hidden'); }
function submitDeposit() {
  submitDepositRequest();
}

// ── SHARE MODAL ────────────────────────────────────────────────────────────
function openShare() { el('shareModal').classList.remove('hidden'); el('shareBalDisplay').textContent=fmt(walletCC,4)+' IK'; }
function calcShare() {
  const amt=parseFloat(el('shareAmt')?.value)||0;
  const fee=amt*.001, gets=amt-fee;
  if(el('shareSend')) el('shareSend').textContent=fmt(amt,4)+' IK';
  if(el('shareFee'))  el('shareFee').textContent=fmt(fee,6)+' IK';
  if(el('shareGet'))  el('shareGet').textContent=fmt(gets,4)+' IK';
}
function executeShare() {
  const toEmail=el('shareEmail')?.value.trim();
  const amt=parseFloat(el('shareAmt')?.value)||0;
  if(!toEmail||!toEmail.includes('@')){ showAuthMsg('shareMsg','⚠️ Enter valid recipient email','error'); return; }
  if(amt<=0){ showAuthMsg('shareMsg','⚠️ Enter amount','error'); return; }
  if(amt>walletCC){ showAuthMsg('shareMsg','⚠️ Insufficient balance','error'); return; }
  const users=getUsers();
  const fee=amt*.001, sends=amt-fee;
  walletCC-=amt; saveUserWallet();
  // credit recipient if registered
  if(users[toEmail]){ users[toEmail].walletCC=(parseFloat(users[toEmail].walletCC)||0)+sends; localStorage.setItem('ccUsers',JSON.stringify(users)); }
  saveTx('SHARE',amt,amt*price,fee,'Internal',sends+' IK → '+toEmail);
  showAuthMsg('shareMsg','✅ Sent '+fmt(sends,4)+' IK to '+toEmail,'success');
  el('shareAmt').value=''; el('shareEmail').value=''; calcShare();
  el('shareBalDisplay').textContent=fmt(walletCC,4)+' IK';
  showToast('✅ Coins shared!');
  setTimeout(()=>closeModal('shareModal'),2500);
}

// ── RECEIVE MODAL ──────────────────────────────────────────────────────────
function openReceive() {
  el('receiveModal').classList.remove('hidden');
  el('recvAddr').textContent = currentUser?.walletAddr || 'IK'+Math.random().toString(36).substr(2,12).toUpperCase();
}
function copyAddr() {
  const addr=el('recvAddr').textContent;
  navigator.clipboard?.writeText(addr).then(()=>showToast('📋 Address copied!')).catch(()=>showToast('📋 '+addr));
}

function closeModal(id) { el(id).classList.add('hidden'); }

// ── WALLET ─────────────────────────────────────────────────────────────────
function renderWallet() {
  const usd=walletCC*price;
  if(el('walletBalance'))   el('walletBalance').textContent='$'+fmt(usd,2);
  if(el('walletCCDisplay')) el('walletCCDisplay').textContent=fmt(walletCC,4)+' IK';
  const txs=JSON.parse(localStorage.getItem('ccTxs_'+currentUser?.email)||'[]');
  const list=el('walletTxList'); if(!list) return;
  if(!txs.length){ list.innerHTML='<div class="empty-state"><i class="fa-solid fa-inbox"></i><p>No transactions yet</p></div>'; return; }
  list.innerHTML=txs.slice(0,20).map(t=>`
    <div class="tx-item">
      <div class="txi-left">
        <div class="txi-icon ${t.type==='BUY'||t.type==='DEPOSIT'?'txi-buy':'txi-sell'}">
          <i class="fa-solid ${t.type==='BUY'?'fa-circle-plus':t.type==='DEPOSIT'?'fa-arrow-down':t.type==='SHARE'?'fa-paper-plane':'fa-circle-minus'}"></i>
        </div>
        <div><div class="txi-type">${t.type} <span style="font-size:.68rem;color:#6b7280">${t.method||''}</span></div><div class="txi-time">${t.time}</div></div>
      </div>
      <div class="txi-right">
        <div class="txi-cc ${t.type==='BUY'||t.type==='DEPOSIT'?'green':'red'}">${t.type==='BUY'?'+':t.type==='DEPOSIT'?'+':t.type==='SHARE'?'−':'−'}${t.cc} IK</div>
        <div class="txi-usd">${t.extra||('$'+t.usd)}</div>
      </div>
    </div>`).join('');
}

function saveUserWallet() {
  if(!currentUser) return;
  const users=getUsers();
  users[currentUser.email].walletCC=walletCC;
  localStorage.setItem('ccUsers',JSON.stringify(users));
}

function saveTx(type,cc,usd,fee,method,extra) {
  const key='ccTxs_'+(currentUser?.email||'guest');
  const txs=JSON.parse(localStorage.getItem(key)||'[]');
  txs.unshift({type,cc:fmt(cc,4),usd:fmt(usd,2),fee:fmt(fee,4),method,extra,time:new Date().toLocaleString()});
  if(txs.length>100) txs.pop();
  localStorage.setItem(key,JSON.stringify(txs));
  // also save to global for admin
  const all=JSON.parse(localStorage.getItem('ccTxs')||'[]');
  all.unshift({type,cc:fmt(cc,4),usd:fmt(usd,2),fee:fmt(fee,4),method,extra,email:currentUser?.email,time:new Date().toLocaleString()});
  if(all.length>200) all.pop();
  localStorage.setItem('ccTxs',JSON.stringify(all));
}

const SURPRISE_TARGET = 1000000; // 1 million IK sell = surprise reward

function getSoldTotal() {
  const txs = JSON.parse(localStorage.getItem('ccTxs_'+(currentUser?.email||''))||'[]');
  return txs.filter(t=>t.type==='SELL').reduce((s,t)=>s+parseFloat(t.cc||0),0);
}

function renderSurpriseCard() {
  const sold   = getSoldTotal();
  const pct    = Math.min(100, (sold/SURPRISE_TARGET)*100);
  const done   = sold >= SURPRISE_TARGET;
  const fill   = document.getElementById('surpriseFill');
  const lbl    = document.getElementById('surpriseSold');
  const status = document.getElementById('surpriseStatus');
  if(fill)   fill.style.width = pct.toFixed(2)+'%';
  if(lbl)    lbl.textContent  = fmt(sold,0)+' IK sold';
  if(status) {
    if(done && !currentUser?.surpriseClaimed) {
      status.innerHTML = `
        <div class="surprise-done">
          🎉 Mubarak! 1M IK sell complete!
          <button class="surprise-claim-btn" onclick="claimSurprise()">
            🎁 Claim Surprise Reward
          </button>
        </div>`;
    } else if(done && currentUser?.surpriseClaimed) {
      status.innerHTML = '<div class="surprise-claimed">✅ Reward claimed! Team aapse contact karega.</div>';
    } else {
      const left = fmt(SURPRISE_TARGET - sold, 0);
      status.innerHTML = `<div class="surprise-remaining">🔥 ${left} IK aur sell karo reward unlock karne ke liye!</div>`;
    }
  }
}

function claimSurprise() {
  if(!currentUser || currentUser.surpriseClaimed) return;
  const users = getUsers();
  users[currentUser.email].surpriseClaimed = true;
  currentUser.surpriseClaimed = true;
  localStorage.setItem('ccUsers', JSON.stringify(users));
  // save claim request for admin
  const claims = JSON.parse(localStorage.getItem('ccSurpriseClaims')||'[]');
  claims.push({ email:currentUser.email, name:currentUser.name, phone:currentUser.phone, time:new Date().toLocaleString() });
  localStorage.setItem('ccSurpriseClaims', JSON.stringify(claims));
  renderSurpriseCard();
  showToast('🎁 Reward claim ho gaya! Team 24h mein contact karegi.');
}
function triggerAvatarUpload() { el('avatarInput').click(); }

function handleAvatarUpload(e) {
  const file = e.target.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    const dataUrl = ev.target.result;
    // save to user
    const users = getUsers();
    users[currentUser.email].avatar = dataUrl;
    currentUser.avatar = dataUrl;
    localStorage.setItem('ccUsers', JSON.stringify(users));
    applyAvatar(dataUrl);
    showToast('✅ Profile photo updated!');
  };
  reader.readAsDataURL(file);
}

function applyAvatar(dataUrl) {
  const img  = el('profileAvatarImg');
  const icon = el('profileAvatarIcon');
  const hBtn = el('headerProfileBtn');
  const hIcon= el('headerProfileIcon');
  if(dataUrl) {
    // profile page
    if(img)  { img.src = dataUrl; img.style.display='block'; }
    if(icon) icon.style.display = 'none';
    // header button
    if(hBtn) {
      hBtn.style.backgroundImage = `url(${dataUrl})`;
      hBtn.style.backgroundSize  = 'cover';
      hBtn.style.backgroundPosition = 'center';
      if(hIcon) hIcon.style.display = 'none';
    }
  } else {
    if(img)  { img.src=''; img.style.display='none'; }
    if(icon) icon.style.display = '';
    if(hBtn) { hBtn.style.backgroundImage=''; }
    if(hIcon) hIcon.style.display = '';
  }
}

// ── TOAST ─────────────────────────────────────────────────────────────────
function showToast(msg) {
    const t=el('mToast'); t.textContent=msg; t.classList.remove('hidden');
    setTimeout(()=>t.classList.add('hidden'), 2500);
}

// ── INIT APP ───────────────────────────────────────────────────────────────
function initApp() {
  // set Binance ID in UI
  if(el('binanceIdDisplay')) el('binanceIdDisplay').textContent = BINANCE_ID;
  if(el('depBinanceId'))     el('depBinanceId').textContent     = BINANCE_ID;
  // profile
  if(el('profileName'))  el('profileName').textContent  = currentUser.name;
  if(el('profileEmail')) el('profileEmail').textContent = currentUser.email;
  if(el('profilePhone')) el('profilePhone').textContent = currentUser.phone||'';
  // load saved avatar
  applyAvatar(currentUser.avatar || null);
  // settings
  const supply=parseFloat(S.supply||500000000);
  if(el('totalCoins'))  el('totalCoins').textContent  = fmt(supply,2);
  if(el('teamHolders')) el('teamHolders').textContent = Number(S.holders||12450).toLocaleString();
  const used=1369.56;
  if(el('remainCoins')) el('remainCoins').textContent = fmt(supply-used,2);
  if(el('usedCoins'))   el('usedCoins').textContent   = fmt(used,2);
  // price history
  for(let i=0;i<60;i++){ price=Math.max(0.0001,price+(Math.random()-.48)*adminPrice*0.0002); hist.push(price); }
  open=hist[0]; high24=Math.max(...hist)*1.01; low24=Math.min(...hist)*.99;
  tick(); buildChart();
  setInterval(tick,2000);
  fetchMarket(); setInterval(fetchMarket,30000);
}

// ── REFERRAL SYSTEM ───────────────────────────────────────────────────────

function getMyReferralLink() {
  return window.location.href.split('?')[0] + '?ref=' + (currentUser?.referralCode||'');
}

function copyReferralLink() {
  const link = getMyReferralLink();
  navigator.clipboard?.writeText(link)
    .then(()=>showToast('🔗 Referral link copied!'))
    .catch(()=>{ prompt('Copy this link:',link); });
}

function shareReferralLink() {
  const link = getMyReferralLink();
  const text = '🚀 Join IK Coin Wallet & get FREE IK coins!\n\n'+link;
  if(navigator.share) navigator.share({title:'IK Coin Wallet',text,url:link});
  else copyReferralLink();
}

function renderTeamPage() {
  if(!currentUser) return;
  // hamesha fresh data lo localStorage se
  const fresh = getUsers()[currentUser.email];
  if(fresh) { currentUser = fresh; walletCC = parseFloat(fresh.walletCC||0); }

  const myRefs = currentUser.referrals || [];
  if(el('refCode'))   el('refCode').textContent   = currentUser.referralCode || '—';
  if(el('refTotal'))  el('refTotal').textContent  = myRefs.length;
  if(el('refEarned')) el('refEarned').textContent = fmt(currentUser.refEarned||0,2)+' IK';
  if(el('refLink'))   el('refLink').value         = getMyReferralLink();

  const list = el('refList'); if(!list) return;
  if(!myRefs.length) {
    list.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-user-plus"></i>
        <p>Abhi koi referral nahi.<br/>Apna link share karo!</p>
        <div style="margin-top:10px;font-size:.78rem;color:#6b7280">
          Join bonus: <strong style="color:#22c55e">+${REF_JOIN_BONUS} IK</strong> &nbsp;|
          Sell commission: <strong style="color:#f5c518">${getRefSellPct()}% IK</strong>
        </div>
      </div>`;
    return;
  }
  list.innerHTML = myRefs.map(r => `
    <div class="ref-item">
      <div class="ref-avatar"><i class="fa-solid fa-user"></i></div>
      <div class="ref-info">
        <div class="ref-name">${r.name}</div>
        <div class="ref-email">${r.email}</div>
        <div class="ref-date">Joined: ${r.joinedAt}</div>
      </div>
      <div class="ref-bonus ${r.hasBought ? 'green' : 'orange'}">
        ${r.hasBought ? '+'+fmt(parseFloat(r.totalEarned||0),2)+' IK' : '+'+REF_JOIN_BONUS+' IK'}
        <div style="font-size:.65rem;color:#6b7280">${r.hasBought ? '✅ Sell commission' : '⏳ Joined'}</div>
      </div>
    </div>`).join('');
}

function checkReferralOnBoot() {
  const ref = new URLSearchParams(window.location.search).get('ref');
  if(ref) localStorage.setItem('pendingRef', ref);
}

function applyReferralOnRegister(newEmail) {
  const refCode = localStorage.getItem('pendingRef'); if(!refCode) return;
  const users   = getUsers();
  const referrer = Object.values(users).find(u => u.referralCode === refCode);
  if(!referrer || referrer.email === newEmail) return;

  // referrer ko join bonus
  referrer.walletCC  = (parseFloat(referrer.walletCC)||0)  + REF_JOIN_BONUS;
  referrer.refEarned = (parseFloat(referrer.refEarned)||0) + REF_JOIN_BONUS;
  referrer.referrals = referrer.referrals || [];
  referrer.referrals.push({ name:users[newEmail]?.name||'User', email:newEmail, joinedAt:new Date().toLocaleDateString(), hasBought:false, totalEarned:'0.00' });

  // naye user ko self bonus (SIRF referral se aaya ho toh)
  users[newEmail].walletCC   = (parseFloat(users[newEmail].walletCC)||0) + REF_SELF_BONUS;
  users[newEmail].referredBy = referrer.email;

  users[referrer.email] = referrer;
  localStorage.setItem('ccUsers', JSON.stringify(users));
  localStorage.removeItem('pendingRef');

  setTimeout(() => showToast('🎁 +' + REF_SELF_BONUS + ' IK join bonus mila!'), 1500);
}

function applyReferralOnBuy(buyerEmail, boughtCC) {
  const users   = getUsers();
  const buyer   = users[buyerEmail];
  if(!buyer || !buyer.referredBy) return;
  const referrer = users[buyer.referredBy]; if(!referrer) return;

  const pct   = getRefBuyPct();           // default 10%
  const bonus = boughtCC * (pct / 100);   // e.g. 1000 IK buy → 100 IK bonus

  referrer.walletCC  = (parseFloat(referrer.walletCC)||0)  + bonus;
  referrer.refEarned = (parseFloat(referrer.refEarned)||0) + bonus;
  referrer.referrals = (referrer.referrals||[]).map(r =>
    r.email === buyerEmail
      ? {...r, hasBought:true, totalEarned: fmt((parseFloat(r.totalEarned||0)+bonus),2)}
      : r
  );

  users[referrer.email] = referrer;
  localStorage.setItem('ccUsers', JSON.stringify(users));

  if(currentUser && currentUser.email === referrer.email) {
    walletCC    = parseFloat(referrer.walletCC);
    currentUser = referrer;
    saveUserWallet();
    renderTeamPage();
    showToast('💰 +' + fmt(bonus,2) + ' IK referral bonus mila!');
  }
}

function applyReferralOnSell(sellerEmail, soldCC) {
  const users   = getUsers();
  const seller  = users[sellerEmail];
  if(!seller || !seller.referredBy) return;
  const referrer = users[seller.referredBy]; if(!referrer) return;

  const pct      = getRefSellPct();          // admin-set % (default 10)
  const bonus    = soldCC * (pct / 100);     // e.g. 1000 CC sell → 100 CC bonus

  referrer.walletCC  = (parseFloat(referrer.walletCC)||0)  + bonus;
  referrer.refEarned = (parseFloat(referrer.refEarned)||0) + bonus;

  // referral list mein total earned update karo
  referrer.referrals = (referrer.referrals||[]).map(r =>
    r.email === sellerEmail
      ? {...r, hasBought:true, totalEarned: fmt((parseFloat(r.totalEarned||0)+bonus),2)}
      : r
  );

  users[referrer.email] = referrer;
  localStorage.setItem('ccUsers', JSON.stringify(users));

  // agar referrer abhi logged in hai toh live update
  if(currentUser && currentUser.email === referrer.email) {
    walletCC   = parseFloat(referrer.walletCC);
    currentUser = referrer;
    saveUserWallet();
    renderTeamPage();
    showToast('💰 +' + fmt(bonus,2) + ' IK referral commission mila!');
  }
}

// ── BOOT ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded',()=>{
  checkReferralOnBoot();
  const savedEmail = localStorage.getItem('ccCurrentUser');
  if(savedEmail) {
    const users=getUsers();
    if(users[savedEmail]){
      currentUser=users[savedEmail];
      walletCC=parseFloat(currentUser.walletCC||0);
      el('authScreen').classList.add('hidden');
      el('mainApp').classList.remove('hidden');
      initApp(); return;
    }
  }
  showLogin();
});

// ── SUPPORT TICKET SYSTEM ─────────────────────────────────────────────────
function openSupportModal() {
  const m = el('supportModal'); if(m) m.classList.remove('hidden');
}
function submitTicket() {
  const subject = el('ticketSubject')?.value.trim();
  const message = el('ticketMessage')?.value.trim();
  if(!subject) { showToast('⚠️ Subject daalo'); return; }
  if(!message) { showToast('⚠️ Message daalo'); return; }
  const tickets = JSON.parse(localStorage.getItem('ccTickets')||'[]');
  tickets.unshift({
    email: currentUser.email,
    name: currentUser.name,
    subject, message,
    status: 'open',
    replies: [],
    time: new Date().toLocaleString()
  });
  localStorage.setItem('ccTickets', JSON.stringify(tickets));
  el('ticketSubject').value = ''; el('ticketMessage').value = '';
  closeModal('supportModal');
  showToast('🎫 Ticket submit ho gaya! Admin jald reply karega.');
}
function openMyTickets() {
  const m = el('myTicketsModal'); if(!m) return;
  m.classList.remove('hidden');
  const tickets = JSON.parse(localStorage.getItem('ccTickets')||'[]')
    .filter(t => t.email === currentUser?.email);
  const list = el('myTicketsList'); if(!list) return;
  if(!tickets.length) { list.innerHTML='<div style="text-align:center;padding:24px;color:#6b7280;font-size:.82rem">Koi ticket nahi abhi</div>'; return; }
  list.innerHTML = tickets.map(t => {
    const statusClr = t.status==='closed'?'#ef4444':t.status==='replied'?'#22c55e':'#f5c518';
    const replies = (t.replies||[]).map(r =>
      `<div style="padding:8px 10px;border-radius:8px;margin-top:6px;font-size:.78rem;${r.sender==='admin'?'background:rgba(245,197,24,.08);border:1px solid rgba(245,197,24,.15)':'background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)'}">
        <strong>${r.sender==='admin'?'👨‍💼 Admin':'👤 You'}:</strong> ${r.message}
        <div style="font-size:.65rem;color:#4b5563;margin-top:3px">${r.time}</div>
      </div>`
    ).join('');
    return `<div style="background:#111827;border:1px solid rgba(245,197,24,.15);border-radius:14px;padding:13px;margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
        <div style="font-size:.86rem;font-weight:700">${t.subject}</div>
        <span style="font-size:.68rem;font-weight:700;color:${statusClr}">${t.status.toUpperCase()}</span>
      </div>
      <div style="font-size:.78rem;color:#9ca3af">${t.message}</div>
      ${replies}
      <div style="font-size:.65rem;color:#4b5563;margin-top:6px">🕐 ${t.time}</div>
    </div>`;
  }).join('');
}

// ── DEPOSIT REQUEST (Admin Approval) ─────────────────────────────────────
function submitDepositRequest() {
  const amt  = parseFloat(el('depAmount')?.value)||0;
  const txid = el('depTxId')?.value.trim();
  if(amt<=0)  { showAuthMsg('depMsg','⚠️ Enter USDT amount','error'); return; }
  if(!txid)   { showAuthMsg('depMsg','⚠️ Enter Transaction ID','error'); return; }
  const reqs = JSON.parse(localStorage.getItem('ccDepositReqs')||'[]');
  reqs.unshift({ email:currentUser.email, amount_usd:amt, txid, status:'pending', time:new Date().toLocaleString() });
  localStorage.setItem('ccDepositReqs', JSON.stringify(reqs));
  showAuthMsg('depMsg','✅ Request submitted! Admin approve karega.','success');
  el('depAmount').value=''; el('depTxId').value='';
  setTimeout(()=>closeModal('depositModal'),2000);
}

// ── WITHDRAWAL REQUEST (Admin Approval) ──────────────────────────────────
function submitWithdrawRequest() {
  const cc  = parseFloat(el('mSellCC')?.value)||0;
  const acc = el('sellAccNum')?.value.trim();
  if(cc<=0)       { showTradeMsg('error','⚠️ Enter IK amount'); return; }
  if(cc>walletCC) { showTradeMsg('error','⚠️ Insufficient balance'); return; }
  if(!acc)        { showTradeMsg('error','⚠️ Enter Binance ID'); return; }
  // Hold balance
  walletCC -= cc; saveUserWallet();
  const reqs = JSON.parse(localStorage.getItem('ccWithdrawReqs')||'[]');
  reqs.unshift({ email:currentUser.email, amount_cc:cc, binance_id:acc, status:'pending', time:new Date().toLocaleString() });
  localStorage.setItem('ccWithdrawReqs', JSON.stringify(reqs));
  el('mSellCC').value=''; el('sellAccNum').value=''; mCalcSell();
  showTradeMsg('success',`⏳ Withdrawal request submitted! Admin approve karega.`);
  showToast('⏳ Withdrawal request sent!');
}

// ── NOTIFICATIONS (in-app) ────────────────────────────────────────────────
function addNotification(title, body, type='info') {
  if(!currentUser) return;
  const key = 'ccNotifs_'+currentUser.email;
  const notifs = JSON.parse(localStorage.getItem(key)||'[]');
  notifs.unshift({ title, body, type, is_read:false, time:new Date().toLocaleString() });
  if(notifs.length>50) notifs.pop();
  localStorage.setItem(key, JSON.stringify(notifs));
  updateNotifBadge();
}
function updateNotifBadge() {
  if(!currentUser) return;
  const notifs = JSON.parse(localStorage.getItem('ccNotifs_'+currentUser.email)||'[]');
  const unread = notifs.filter(n=>!n.is_read).length;
  const badge = el('notifBadge');
  if(badge) { badge.textContent=unread; badge.style.display=unread?'flex':'none'; }
}
function openNotifications() {
  const m = el('notifModal'); if(!m) return;
  m.classList.remove('hidden');
  const key = 'ccNotifs_'+currentUser.email;
  const notifs = JSON.parse(localStorage.getItem(key)||'[]');
  // Mark all read
  notifs.forEach(n=>n.is_read=true);
  localStorage.setItem(key, JSON.stringify(notifs));
  updateNotifBadge();
  const list = el('notifList'); if(!list) return;
  if(!notifs.length) { list.innerHTML='<div style="text-align:center;padding:24px;color:#6b7280;font-size:.82rem">Koi notification nahi</div>'; return; }
  const clr = {info:'#06b6d4',success:'#22c55e',warning:'#f59e0b',error:'#ef4444'};
  list.innerHTML = notifs.map(n=>`
    <div style="background:#111827;border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:12px;margin-bottom:8px">
      <div style="font-size:.84rem;font-weight:700;color:${clr[n.type]||'#fff'}">${n.title}</div>
      <div style="font-size:.78rem;color:#9ca3af;margin-top:4px">${n.body}</div>
      <div style="font-size:.65rem;color:#4b5563;margin-top:5px">🕐 ${n.time}</div>
    </div>`).join('');
}
