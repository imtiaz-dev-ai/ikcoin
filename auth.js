const REF_JOIN_BONUS = 50;
const REF_SELF_BONUS = 25;

let currentUser = null;

const el   = id => document.getElementById(id);
const fmt  = (n,d=2) => Number(n).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
const fmtP = n => n<1?'$'+fmt(n,6):'$'+fmt(n,2);
const pct  = p => (p>=0?'+':'')+fmt(p,2)+'%';

function showAuthMsg(id, msg, type) {
    const e = el(id); if(!e) return;
    e.textContent = msg;
    e.className = 'auth-msg '+(type==='error'?'auth-err':'auth-ok');
    setTimeout(()=>e.textContent='', 5000);
}

// ── GOOGLE LOGIN ──────────────────────────────────────────────────────────
async function googleLogin() {
    const btn = el('googleLoginBtn') || document.querySelector('#googleBtnWrap button');
    if(btn) { btn.disabled=true; btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Signing in...'; }

    try {
        const result  = await window.firebaseAuth.signInWithPopup(window.googleProvider);
        const fbUser  = result.user;
        const email   = fbUser.email;
        const name    = fbUser.displayName || email.split('@')[0];
        const avatar  = fbUser.photoURL || '';

        showAuthMsg('loginMsg','⏳ Setting up account...','success');

        // Check if user exists in Firestore
        const snap = await window.db.collection('users').doc(email).get();
        let userData;

        if(!snap.exists) {
            // New user — register
            const ref_code = localStorage.getItem('pendingRef') || '';
            const res = await DB.register(name, email, '', ref_code);
            userData = res.user;
            localStorage.removeItem('pendingRef');
        } else {
            userData = snap.data();
            if(userData.status === 'banned')    { showAuthMsg('loginMsg','🚫 Account banned.','error'); resetBtn(btn); return; }
            if(userData.status === 'suspended') { showAuthMsg('loginMsg','⚠️ Account suspended.','error'); resetBtn(btn); return; }
        }

        // Save Google avatar
        if(avatar && !userData.avatar_url) {
            await window.db.collection('users').doc(email).update({ avatar_url: avatar });
            userData.avatar_url = avatar;
        }

        _loginSuccess(userData);

    } catch(e) {
        console.error('Login error:', e);
        const msg = e.code === 'auth/popup-closed-by-user'
            ? '⚠️ Popup band ho gaya. Dobara try karo.'
            : e.code === 'auth/popup-blocked'
            ? '⚠️ Popup blocked! Browser settings mein allow karo.'
            : '❌ Login failed: ' + (e.message||'Unknown error');
        showAuthMsg('loginMsg', msg, 'error');
        resetBtn(btn);
    }
}

function resetBtn(btn) {
    if(btn) { btn.disabled=false; btn.innerHTML='<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="20"/> Sign in with Google'; }
}

function _loginSuccess(user) {
    currentUser = user;
    localStorage.setItem('ccCurrentUser', user.email);
    el('authScreen').classList.add('hidden');
    el('mainApp').classList.remove('hidden');
    initApp();
}

function logout() {
    if(!confirm('Logout?')) return;
    localStorage.removeItem('ccCurrentUser');
    currentUser = null;
    window.firebaseAuth.signOut();
    el('mainApp').classList.add('hidden');
    el('authScreen').classList.remove('hidden');
}

function checkReferralOnBoot() {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if(ref) localStorage.setItem('pendingRef', ref);
}

// ── BOOT ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    checkReferralOnBoot();
    const savedEmail = localStorage.getItem('ccCurrentUser');
    if(savedEmail) {
        try {
            const snap = await window.db.collection('users').doc(savedEmail).get();
            if(snap.exists) {
                currentUser = snap.data();
                walletCC    = parseFloat(currentUser.wallet_cc||0);
                el('authScreen').classList.add('hidden');
                el('mainApp').classList.remove('hidden');
                initApp(); return;
            }
        } catch(e) {}
    }
    el('authScreen').classList.remove('hidden');
});
