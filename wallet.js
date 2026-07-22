// ── WALLET STATE ──────────────────────────────────────────────────────────
let walletCC = 0;
let locked   = true;

// ── RENDER WALLET ─────────────────────────────────────────────────────────
async function renderWallet() {
    const usd = walletCC * price;
    if(el('walletBalance'))   el('walletBalance').textContent   = '$'+fmt(usd,2);
    if(el('walletCCDisplay')) el('walletCCDisplay').textContent = fmt(walletCC,4)+' IK';

    const list = el('walletTxList'); if(!list) return;
    try {
        const data = await DB.getUser(currentUser.email);
        const txs  = data.transactions || [];
        if(!txs.length) { list.innerHTML='<div class="empty-state"><i class="fa-solid fa-inbox"></i><p>No transactions yet</p></div>'; return; }
        list.innerHTML = txs.map(t => `
            <div class="tx-item">
                <div class="txi-left">
                    <div class="txi-icon ${t.type==='BUY'||t.type==='DEPOSIT'?'txi-buy':'txi-sell'}">
                        <i class="fa-solid ${t.type==='BUY'?'fa-circle-plus':t.type==='DEPOSIT'?'fa-arrow-down':t.type==='SHARE'?'fa-paper-plane':'fa-circle-minus'}"></i>
                    </div>
                    <div>
                        <div class="txi-type">${t.type} <span style="font-size:.68rem;color:#6b7280">${t.method||''}</span></div>
                        <div class="txi-time">${new Date(t.created_at).toLocaleString()}</div>
                    </div>
                </div>
                <div class="txi-right">
                    <div class="txi-cc ${t.type==='BUY'||t.type==='DEPOSIT'?'green':'red'}">${t.type==='SELL'||t.type==='SHARE'?'−':'+'}${fmt(t.cc,2)} IK</div>
                    <div class="txi-usd">${t.extra||('$'+fmt(t.usd,2))}</div>
                </div>
            </div>`).join('');
    } catch(e) {
        list.innerHTML = '<div class="empty-state"><p>Error loading transactions</p></div>';
    }
}

async function saveUserWallet() {
    if(!currentUser) return;
    try { await DB.updateWallet(currentUser.email, walletCC); } catch(e) {}
}

// ── LOCK ──────────────────────────────────────────────────────────────────
function toggleLock() {
    locked = !locked;
    const btn=el('lockBtn'), icon=el('lockIcon'), txt=el('lockText');
    if(!locked) { btn.classList.add('unlocked'); icon.className='fa-solid fa-lock-open'; txt.textContent='Trading Unlocked'; showToast('🔓 Trading Unlocked!'); }
    else        { btn.classList.remove('unlocked'); icon.className='fa-solid fa-lock'; txt.textContent='Tap to Unlock Trading'; showToast('🔒 Trading Locked'); }
}

// ── TRADE CALC ────────────────────────────────────────────────────────────
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
    el('tpBuy').classList.toggle('hidden',  t!=='buy');
    el('tpSell').classList.toggle('hidden', t!=='sell');
    el('ttBuy').classList.toggle('active',  t==='buy');
    el('ttSell').classList.toggle('active', t==='sell');
    el('tradeMsg').classList.add('hidden');
}

function showTradeMsg(type,msg){
    const m=el('tradeMsg'); m.textContent=msg;
    m.className='trade-msg '+type;
    m.classList.remove('hidden');
    setTimeout(()=>m.classList.add('hidden'),5000);
}

// ── BUY — Submit deposit request ──────────────────────────────────────────
async function mExecBuy() {
    if(locked){ showTradeMsg('error','🔒 Unlock trading first!'); return; }
    const usd  = parseFloat(el('mBuyUSDT')?.value)||0;
    const txid = el('mBuyTxId')?.value.trim();
    if(usd<=0)  { showTradeMsg('error','⚠️ Enter USDT amount'); return; }
    if(!txid)   { showTradeMsg('error','⚠️ Enter Transaction ID'); return; }
    try {
        await DB.submitDeposit(currentUser.email, usd, txid);
        el('mBuyUSDT').value=''; el('mBuyTxId').value=''; mCalcBuy();
        showTradeMsg('success','⏳ Deposit request submitted! Admin approve karega.');
        showToast('⏳ Request sent!');
    } catch(e) {
        showTradeMsg('error','⚠️ '+e.message);
    }
}

// ── SELL — Submit withdrawal request ─────────────────────────────────────
async function mExecSell() {
    if(locked){ showTradeMsg('error','🔒 Unlock trading first!'); return; }
    const cc  = parseFloat(el('mSellCC')?.value)||0;
    const acc = el('sellAccNum')?.value.trim();
    if(cc<=0)       { showTradeMsg('error','⚠️ Enter IK amount'); return; }
    if(cc>walletCC) { showTradeMsg('error','⚠️ Insufficient balance'); return; }
    if(!acc)        { showTradeMsg('error','⚠️ Enter Binance ID'); return; }
    try {
        await DB.submitWithdraw(currentUser.email, cc, acc);
        walletCC -= cc;
        el('mSellCC').value=''; el('sellAccNum').value=''; mCalcSell();
        showTradeMsg('success','⏳ Withdrawal request submitted! Admin approve karega.');
        showToast('⏳ Withdrawal request sent!');
        renderWallet();
    } catch(e) {
        showTradeMsg('error','⚠️ '+e.message);
    }
}

// ── DEPOSIT MODAL ─────────────────────────────────────────────────────────
function openDeposit() { el('depositModal').classList.remove('hidden'); }
async function submitDeposit() {
    const amt  = parseFloat(el('depAmount')?.value)||0;
    const txid = el('depTxId')?.value.trim();
    if(amt<=0) { showAuthMsg('depMsg','⚠️ Enter USDT amount','error'); return; }
    if(!txid)  { showAuthMsg('depMsg','⚠️ Enter Transaction ID','error'); return; }
    try {
        await DB.submitDeposit(currentUser.email, amt, txid);
        showAuthMsg('depMsg','✅ Request submitted! Admin approve karega.','success');
        el('depAmount').value=''; el('depTxId').value='';
        setTimeout(()=>closeModal('depositModal'), 2000);
    } catch(e) {
        showAuthMsg('depMsg','⚠️ '+e.message,'error');
    }
}

// ── SHARE MODAL ───────────────────────────────────────────────────────────
function openShare() {
    el('shareModal').classList.remove('hidden');
    el('shareBalDisplay').textContent = fmt(walletCC,4)+' IK';
}
function calcShare() {
    const amt=parseFloat(el('shareAmt')?.value)||0;
    const fee=amt*.001, gets=amt-fee;
    if(el('shareSend')) el('shareSend').textContent=fmt(amt,4)+' IK';
    if(el('shareFee'))  el('shareFee').textContent=fmt(fee,6)+' IK';
    if(el('shareGet'))  el('shareGet').textContent=fmt(gets,4)+' IK';
}
async function executeShare() {
    const toEmail = el('shareEmail')?.value.trim();
    const amt     = parseFloat(el('shareAmt')?.value)||0;
    if(!toEmail||!toEmail.includes('@')){ showAuthMsg('shareMsg','⚠️ Valid recipient email daalo','error'); return; }
    if(amt<=0)      { showAuthMsg('shareMsg','⚠️ Amount daalo','error'); return; }
    if(amt>walletCC){ showAuthMsg('shareMsg','⚠️ Insufficient balance','error'); return; }
    const fee   = amt*.001;
    const sends = amt - fee;
    // Deduct from sender
    walletCC -= amt;
    await saveUserWallet();
    // Credit recipient via server (best effort)
    try {
        const rec = await DB.getUser(toEmail);
        if(rec.user) {
            await DB.updateWallet(toEmail, (parseFloat(rec.user.wallet_cc)||0) + sends);
        }
    } catch(e) {}
    showAuthMsg('shareMsg','✅ Sent '+fmt(sends,4)+' IK to '+toEmail,'success');
    el('shareAmt').value=''; el('shareEmail').value=''; calcShare();
    el('shareBalDisplay').textContent = fmt(walletCC,4)+' IK';
    showToast('✅ Coins shared!');
    setTimeout(()=>closeModal('shareModal'), 2500);
}

// ── RECEIVE MODAL ─────────────────────────────────────────────────────────
function openReceive() {
    el('receiveModal').classList.remove('hidden');
    el('recvAddr').textContent = currentUser?.wallet_addr || '—';
}
function copyAddr() {
    const addr = el('recvAddr').textContent;
    navigator.clipboard?.writeText(addr).then(()=>showToast('📋 Address copied!')).catch(()=>showToast('📋 '+addr));
}

function closeModal(id) { el(id).classList.add('hidden'); }

// ── BINANCE ID ────────────────────────────────────────────────────────────
function copyBinanceId()    { const id=el('binanceIdDisplay')?.textContent; navigator.clipboard?.writeText(id).then(()=>showToast('📋 Binance ID copied!')); }
function copyDepBinanceId() { copyBinanceId(); }
