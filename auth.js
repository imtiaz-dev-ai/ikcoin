// ── CONFIG ────────────────────────────────────────────────────────────────
const EMAILJS_PUBLIC_KEY  = 'vdDOikY44qUJYyR8W';
const EMAILJS_SERVICE_ID  = 'service_bdm0rzu';
const EMAILJS_TEMPLATE_ID = 'template_akxutur';
const REF_JOIN_BONUS = 50;
const REF_SELF_BONUS = 25;

// ── STATE ─────────────────────────────────────────────────────────────────
let currentUser = null;
let otpEmail    = '';
let otpCode     = '';
let otpTimer    = null;

const el  = id => document.getElementById(id);
const fmt = (n,d=2) => Number(n).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
const fmtP = n => n<1?'$'+fmt(n,6):'$'+fmt(n,2);
const pct  = p => (p>=0?'+':'')+fmt(p,2)+'%';

function showAuthMsg(id, msg, type) {
    const e = el(id); if(!e) return;
    e.textContent = msg;
    e.className = 'auth-msg '+(type==='error'?'auth-err':'auth-ok');
    setTimeout(()=>e.textContent='', 4000);
}

function showLogin()    {
    el('stepLogin').classList.remove('hidden');
    el('stepRegister').classList.add('hidden');
    el('stepOTP').classList.add('hidden');
}
function showRegister() {
    el('stepRegister').classList.remove('hidden');
    el('stepLogin').classList.add('hidden');
    el('stepOTP').classList.add('hidden');
    const pending = localStorage.getItem('pendingRef');
    if(pending && el('regRefCode')) { el('regRefCode').value = pending; checkRefCode(pending); }
}

function checkRefCode(code) {
    const box = el('refHintBox'); if(!box) return;
    if(!code || code.length < 4) { box.innerHTML=''; return; }
    box.innerHTML = `<div class="ref-hint-ok">🎁 Code entered — +${REF_SELF_BONUS} IK bonus milega join pe</div>`;
}

// ── SEND OTP (Login) ──────────────────────────────────────────────────────
async function sendOTP() {
    const email = el('loginEmail').value.trim();
    if(!email || !email.includes('@')) { showAuthMsg('loginMsg','⚠️ Valid email daalo','error'); return; }
    await _sendOTPEmail(email);
    showAuthMsg('loginMsg','✅ OTP ready!','success');
    setTimeout(()=>{ el('stepLogin').classList.add('hidden'); el('stepOTP').classList.remove('hidden'); el('otpSubText').textContent='OTP sent to: '+email; startOTPTimer(); }, 800);
}

// ── REGISTER ──────────────────────────────────────────────────────────────
async function registerUser() {
    const name  = el('regName').value.trim();
    const email = el('regEmail').value.trim();
    const phone = el('regPhone').value.trim();
    if(!name)  { showAuthMsg('regMsg','⚠️ Name daalo','error'); return; }
    if(!email || !email.includes('@')) { showAuthMsg('regMsg','⚠️ Valid email daalo','error'); return; }
    if(!phone) { showAuthMsg('regMsg','⚠️ Phone daalo','error'); return; }
    // Save to localStorage for fake mode
    localStorage.setItem('ccCurrentUser', email);
    localStorage.setItem('ccUserName', name);
    localStorage.setItem('ccUserPhone', phone);
    localStorage.removeItem('pendingRef');
    await _sendOTPEmail(email, name);
    showAuthMsg('regMsg','✅ OTP ready!','success');
    setTimeout(()=>{ el('stepRegister').classList.add('hidden'); el('stepOTP').classList.remove('hidden'); el('otpSubText').textContent='OTP sent to: '+email; startOTPTimer(); }, 800);
}

// ── OTP EMAIL ─────────────────────────────────────────────────────────────
async function _sendOTPEmail(email, name='') {
    otpEmail = email;
    otpCode = String(Math.floor(100000 + Math.random()*900000));
    showOTPPopup(otpCode);
}

function showOTPPopup(code) {
    let pop = document.getElementById('otpDevPopup');
    if(!pop) {
        pop = document.createElement('div');
        pop.id = 'otpDevPopup';
        pop.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#1a1a2e;border:2px solid #f5c518;border-radius:16px;padding:24px 28px;z-index:9999;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.7);min-width:240px';
        document.body.appendChild(pop);
    }
    pop.innerHTML = `
        <div style="font-size:.75rem;color:#9ca3af;margin-bottom:6px">🔐 Your OTP Code</div>
        <div style="font-size:2rem;font-weight:700;color:#f5c518;letter-spacing:8px;margin-bottom:14px">${code}</div>
        <button onclick="document.getElementById('otpDevPopup').remove()" style="background:#f5c518;color:#000;border:none;border-radius:8px;padding:8px 22px;font-weight:700;cursor:pointer;font-size:.9rem">OK</button>
    `;
}

// ── VERIFY OTP ────────────────────────────────────────────────────────────
async function verifyOTP() {
    const entered = ['o1','o2','o3','o4','o5','o6'].map(id=>el(id).value).join('');
    if(entered.length < 6) { showAuthMsg('otpMsg','⚠️ 6 digits daalo','error'); return; }

    if(otpCode && entered === otpCode) {
        const fakeUser = {
            email: otpEmail,
            name: localStorage.getItem('ccUserName') || otpEmail.split('@')[0],
            phone: localStorage.getItem('ccUserPhone') || '',
            wallet_cc: 0,
            ref_code: 'IK'+Math.random().toString(36).substring(2,7).toUpperCase()
        };
        _loginSuccess(fakeUser);
    } else {
        showAuthMsg('otpMsg','❌ Wrong OTP. Try again.','error');
    }
}

function _loginSuccess(user) {
    clearInterval(otpTimer);
    currentUser = user;
    localStorage.setItem('ccCurrentUser', user.email);
    showAuthMsg('otpMsg','✅ Verified! Logging in...','success');
    setTimeout(()=>{
        el('authScreen').classList.add('hidden');
        el('mainApp').classList.remove('hidden');
        initApp();
    }, 700);
}

function otpNext(inp, nextId) {
    inp.value = inp.value.slice(-1);
    if(inp.value && nextId) el(nextId)?.focus();
}

function startOTPTimer() {
    let t = 60; el('otpTimer').textContent = t;
    clearInterval(otpTimer);
    otpTimer = setInterval(()=>{ t--; el('otpTimer').textContent=t; if(t<=0) clearInterval(otpTimer); }, 1000);
}

function logout() {
    if(!confirm('Logout?')) return;
    localStorage.removeItem('ccCurrentUser');
    currentUser = null;
    el('mainApp').classList.add('hidden');
    el('authScreen').classList.remove('hidden');
    showLogin();
}

function checkReferralOnBoot() {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if(ref) localStorage.setItem('pendingRef', ref);
}
