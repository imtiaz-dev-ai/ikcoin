// ── FIRESTORE DB LAYER ────────────────────────────────────────────────────
const DB = {

    // ── USER ─────────────────────────────────────────────────────────────
    async getUser(email) {
        const doc = await window.db.collection('users').doc(email).get();
        if(!doc.exists) throw new Error('User not found');
        const user = doc.data();
        const txSnap  = await window.db.collection('transactions').where('email','==',email).orderBy('created_at','desc').limit(50).get();
        const refSnap = await window.db.collection('referrals').where('referrer_email','==',email).get();
        const nfSnap  = await window.db.collection('notifications').where('email','==',email).orderBy('created_at','desc').limit(30).get();
        const transactions  = txSnap.docs.map(d=>({id:d.id,...d.data()}));
        const referrals     = refSnap.docs.map(d=>({id:d.id,...d.data()}));
        const notifications = nfSnap.docs.map(d=>({id:d.id,...d.data()}));
        const unread = notifications.filter(n=>!n.is_read).length;
        return { user, transactions, referrals, notifications, unread };
    },

    async register(name, email, phone, ref_code) {
        const ref  = window.db.collection('users').doc(email);
        const snap = await ref.get();
        if(snap.exists) throw new Error('Email already registered');
        const referral_code = 'IK' + Math.random().toString(36).substr(2,6).toUpperCase();
        const wallet_addr   = 'IK' + Math.random().toString(36).substr(2,12).toUpperCase();
        let referred_by = null;
        // Check ref code
        if(ref_code) {
            const rSnap = await window.db.collection('users').where('referral_code','==',ref_code.toUpperCase()).limit(1).get();
            if(!rSnap.empty) referred_by = rSnap.docs[0].id;
        }
        const user = { name, email, phone:phone||'', wallet_cc:0, wallet_addr, referral_code, ref_earned:0, referred_by, avatar_url:'', surprise_claimed:false, status:'active', created_at: firebase.firestore.FieldValue.serverTimestamp() };
        await ref.set(user);
        // Referral bonuses
        if(referred_by) {
            await window.db.collection('users').doc(email).update({ wallet_cc: firebase.firestore.FieldValue.increment(25) });
            await window.db.collection('users').doc(referred_by).update({ wallet_cc: firebase.firestore.FieldValue.increment(50), ref_earned: firebase.firestore.FieldValue.increment(50) });
            await window.db.collection('referrals').add({ referrer_email:referred_by, referred_email:email, has_bought:false, total_earned:0, created_at: firebase.firestore.FieldValue.serverTimestamp() });
            await window.db.collection('notifications').add({ email:referred_by, title:'🎉 New Referral!', body:`${name} ne aapke referral link se join kiya! +50 IK credited.`, type:'success', is_read:false, created_at: firebase.firestore.FieldValue.serverTimestamp() });
        }
        return { user: { ...user, wallet_cc: referred_by ? 25 : 0 } };
    },

    async login(email) {
        const snap = await window.db.collection('users').doc(email).get();
        if(!snap.exists) throw new Error('User not found');
        const user = snap.data();
        if(user.status === 'banned')     throw new Error('Account banned. Contact support.');
        if(user.status === 'suspended')  throw new Error('Account suspended. Contact support.');
        return { user };
    },

    async updateWallet(email, wallet_cc) {
        await window.db.collection('users').doc(email).update({ wallet_cc });
    },

    async updateAvatar(email, avatar_url) {
        await window.db.collection('users').doc(email).update({ avatar_url });
    },

    async markNotifsRead(email) {
        const snap = await window.db.collection('notifications').where('email','==',email).where('is_read','==',false).get();
        const batch = window.db.batch();
        snap.docs.forEach(d => batch.update(d.ref, { is_read:true }));
        await batch.commit();
    },

    async claimSurprise(email) {
        const snap = await window.db.collection('users').doc(email).get();
        const u = snap.data();
        if(u.surprise_claimed) throw new Error('Already claimed');
        await window.db.collection('users').doc(email).update({ surprise_claimed: true });
        await window.db.collection('surprise_claims').add({ email, name:u.name, phone:u.phone||'', created_at: firebase.firestore.FieldValue.serverTimestamp() });
    },

    async submitTicket(email, subject, message) {
        await window.db.collection('support_tickets').add({ email, subject, message, status:'open', replies:[], created_at: firebase.firestore.FieldValue.serverTimestamp() });
    },

    async getMyTickets(email) {
        const snap = await window.db.collection('support_tickets').where('email','==',email).orderBy('created_at','desc').get();
        return snap.docs.map(d=>({id:d.id,...d.data()}));
    },

    // ── PAYMENTS ─────────────────────────────────────────────────────────
    async submitDeposit(email, amount_usd, txid) {
        const snap = await window.db.collection('users').doc(email).get();
        if(!snap.exists) throw new Error('User not found');
        await window.db.collection('deposit_requests').add({ email, amount_usd, txid, status:'pending', cc_credited:0, created_at: firebase.firestore.FieldValue.serverTimestamp() });
    },

    async submitWithdraw(email, amount_cc, binance_id) {
        const snap = await window.db.collection('users').doc(email).get();
        const u = snap.data();
        if((u.wallet_cc||0) < amount_cc) throw new Error('Insufficient balance');
        await window.db.collection('users').doc(email).update({ wallet_cc: firebase.firestore.FieldValue.increment(-amount_cc) });
        await window.db.collection('withdrawal_requests').add({ email, amount_cc, binance_id, status:'pending', created_at: firebase.firestore.FieldValue.serverTimestamp() });
    },

    // ── ADMIN ─────────────────────────────────────────────────────────────
    async adminGetUsers() {
        const snap = await window.db.collection('users').orderBy('created_at','desc').get();
        const users = snap.docs.map(d=>({id:d.id,...d.data()}));
        return {
            users,
            stats: {
                total:    users.length,
                active:   users.filter(u=>u.status==='active').length,
                referred: users.filter(u=>u.referred_by).length
            }
        };
    },

    async adminSetStatus(email, status) {
        await window.db.collection('users').doc(email).update({ status });
        const msgs = { active:['✅ Account Restored','Aapka account dobara active ho gaya.','success'], suspended:['⚠️ Suspended','Aapka account suspend kar diya gaya.','error'], banned:['🚫 Banned','Aapka account ban ho gaya.','error'] };
        if(msgs[status]) {
            const [title,body,type] = msgs[status];
            await window.db.collection('notifications').add({ email, title, body, type, is_read:false, created_at: firebase.firestore.FieldValue.serverTimestamp() });
        }
    },

    async adminGetDeposits() {
        const snap = await window.db.collection('deposit_requests').orderBy('created_at','desc').get();
        return snap.docs.map(d=>({id:d.id,...d.data()}));
    },

    async adminDepositAction(id, action) {
        const ref  = window.db.collection('deposit_requests').doc(id);
        const snap = await ref.get();
        const r    = snap.data();
        if(r.status !== 'pending') throw new Error('Already processed');
        if(action === 'approve') {
            const setSnap = await window.db.collection('settings').doc('main').get();
            const price   = parseFloat(setSnap.exists ? (setSnap.data().price||0.01) : 0.01);
            const fee     = r.amount_usd * 0.005;
            const cc      = (r.amount_usd - fee) / price;
            await window.db.collection('users').doc(r.email).update({ wallet_cc: firebase.firestore.FieldValue.increment(cc) });
            await window.db.collection('transactions').add({ email:r.email, type:'DEPOSIT', cc, usd:r.amount_usd, fee, method:'Binance', extra:'TxID:'+r.txid, created_at: firebase.firestore.FieldValue.serverTimestamp() });
            await ref.update({ status:'approved', cc_credited:cc });
            await window.db.collection('notifications').add({ email:r.email, title:'✅ Deposit Approved', body:`$${r.amount_usd} deposit approved! ${cc.toFixed(2)} IK credited.`, type:'success', is_read:false, created_at: firebase.firestore.FieldValue.serverTimestamp() });
        } else {
            await ref.update({ status:'rejected' });
            await window.db.collection('notifications').add({ email:r.email, title:'❌ Deposit Rejected', body:`$${r.amount_usd} deposit rejected.`, type:'error', is_read:false, created_at: firebase.firestore.FieldValue.serverTimestamp() });
        }
    },

    async adminGetWithdrawals() {
        const snap = await window.db.collection('withdrawal_requests').orderBy('created_at','desc').get();
        return snap.docs.map(d=>({id:d.id,...d.data()}));
    },

    async adminWithdrawAction(id, action) {
        const ref  = window.db.collection('withdrawal_requests').doc(id);
        const snap = await ref.get();
        const r    = snap.data();
        if(r.status !== 'pending') throw new Error('Already processed');
        if(action === 'approve') {
            await ref.update({ status:'approved' });
            await window.db.collection('notifications').add({ email:r.email, title:'✅ Withdrawal Approved', body:`${r.amount_cc} IK withdrawal approved!`, type:'success', is_read:false, created_at: firebase.firestore.FieldValue.serverTimestamp() });
        } else {
            await window.db.collection('users').doc(r.email).update({ wallet_cc: firebase.firestore.FieldValue.increment(r.amount_cc) });
            await ref.update({ status:'rejected' });
            await window.db.collection('notifications').add({ email:r.email, title:'❌ Withdrawal Rejected', body:`${r.amount_cc} IK balance refund ho gaya.`, type:'error', is_read:false, created_at: firebase.firestore.FieldValue.serverTimestamp() });
        }
    },

    async adminGetSettings() {
        const snap = await window.db.collection('settings').doc('main').get();
        return snap.exists ? snap.data() : { price:'0.01', supply:'500000000', holders:'12450', network:'BNB Smart Chain', fee:'0.5', refSellPct:'10', binanceId:'123456789' };
    },

    async adminSaveSettings(settings) {
        await window.db.collection('settings').doc('main').set(settings, { merge:true });
    },

    async adminGetStats() {
        const [txSnap, uSnap, dSnap, wSnap, tSnap] = await Promise.all([
            window.db.collection('transactions').get(),
            window.db.collection('users').get(),
            window.db.collection('deposit_requests').where('status','==','pending').get(),
            window.db.collection('withdrawal_requests').where('status','==','pending').get(),
            window.db.collection('support_tickets').where('status','!=','closed').get()
        ]);
        let buy_volume=0, sell_volume=0, fees=0;
        txSnap.docs.forEach(d=>{ const t=d.data(); const u=parseFloat(t.usd||0); const f=parseFloat(t.fee||0); if(['BUY','DEPOSIT'].includes(t.type)) buy_volume+=u; else sell_volume+=u; fees+=f; });
        return { buy_volume, sell_volume, fees_collected:fees, tx_count:txSnap.size, total_users:uSnap.size, pending_deposits:dSnap.size, pending_withdrawals:wSnap.size, open_tickets:tSnap.size };
    },

    async adminGetTxns() {
        const snap = await window.db.collection('transactions').orderBy('created_at','desc').limit(200).get();
        return snap.docs.map(d=>({id:d.id,...d.data()}));
    },

    async adminGetClaims() {
        const snap = await window.db.collection('surprise_claims').orderBy('created_at','desc').get();
        return snap.docs.map(d=>({id:d.id,...d.data()}));
    },

    async adminGetLogs() {
        const snap = await window.db.collection('admin_logs').orderBy('created_at','desc').limit(100).get();
        return snap.docs.map(d=>({id:d.id,...d.data()}));
    },

    async adminGetTickets() {
        const snap = await window.db.collection('support_tickets').orderBy('created_at','desc').get();
        return snap.docs.map(d=>({id:d.id,...d.data()}));
    },

    async adminTicketReply(ticket_id, message, email) {
        const ref = window.db.collection('support_tickets').doc(ticket_id);
        const snap = await ref.get();
        const replies = snap.data().replies || [];
        replies.push({ sender:'admin', message, created_at: new Date().toISOString() });
        await ref.update({ status:'replied', replies });
        await window.db.collection('notifications').add({ email, title:'💬 Support Reply', body:'Admin ne aapki ticket ka jawab de diya.', type:'info', is_read:false, created_at: firebase.firestore.FieldValue.serverTimestamp() });
    },

    async adminCloseTicket(ticket_id, email) {
        await window.db.collection('support_tickets').doc(ticket_id).update({ status:'closed' });
        await window.db.collection('notifications').add({ email, title:'🔒 Ticket Closed', body:'Aapki support ticket close kar di gayi.', type:'info', is_read:false, created_at: firebase.firestore.FieldValue.serverTimestamp() });
    },

    async adminClearTxns() {
        const snap = await window.db.collection('transactions').get();
        const batch = window.db.batch();
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
    }
};
