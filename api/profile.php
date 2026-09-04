<?php
require 'config.php';
$method = $_SERVER['REQUEST_METHOD'];

// GET user
if($method === 'GET') {
    $email = $_GET['email'] ?? '';
    if(!$email) err('Email required');
    $stmt = $conn->prepare("SELECT * FROM users WHERE email=?");
    $stmt->bind_param('s', $email);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();
    if(!$user) err('User not found', 404);

    // Get transactions
    $tx = $conn->prepare("SELECT * FROM transactions WHERE email=? ORDER BY created_at DESC LIMIT 50");
    $tx->bind_param('s', $email);
    $tx->execute();
    $txs = $tx->get_result()->fetch_all(MYSQLI_ASSOC);

    // Get referrals
    $rf = $conn->prepare("SELECT r.*, u.name, u.email as ref_email FROM referrals r JOIN users u ON u.email=r.referred_email WHERE r.referrer_email=?");
    $rf->bind_param('s', $email);
    $rf->execute();
    $refs = $rf->get_result()->fetch_all(MYSQLI_ASSOC);

    // Get notifications
    $nf = $conn->prepare("SELECT * FROM notifications WHERE email=? ORDER BY created_at DESC LIMIT 30");
    $nf->bind_param('s', $email);
    $nf->execute();
    $notifs = $nf->get_result()->fetch_all(MYSQLI_ASSOC);

    // Unread count
    $uc = $conn->prepare("SELECT COUNT(*) as cnt FROM notifications WHERE email=? AND is_read=0");
    $uc->bind_param('s', $email);
    $uc->execute();
    $unread = $uc->get_result()->fetch_assoc()['cnt'];

    res(['user' => $user, 'transactions' => $txs, 'referrals' => $refs, 'notifications' => $notifs, 'unread' => $unread]);
}

// PUT — update wallet / avatar / mark notifs read
if($method === 'POST') {
    $b      = body();
    $action = $b['action'] ?? '';
    $email  = $b['email']  ?? '';
    if(!$email) err('Email required');

    if($action === 'update_wallet') {
        $cc = floatval($b['wallet_cc']);
        $s = $conn->prepare("UPDATE users SET wallet_cc=? WHERE email=?");
        $s->bind_param('ds', $cc, $email); $s->execute();
        res(['message' => 'Wallet updated']);
    }

    if($action === 'update_avatar') {
        $url = $b['avatar_url'] ?? '';
        $s = $conn->prepare("UPDATE users SET avatar_url=? WHERE email=?");
        $s->bind_param('ss', $url, $email); $s->execute();
        res(['message' => 'Avatar updated']);
    }

    if($action === 'mark_notifs_read') {
        $s = $conn->prepare("UPDATE notifications SET is_read=1 WHERE email=?");
        $s->bind_param('s', $email); $s->execute();
        res(['message' => 'Marked read']);
    }

    if($action === 'claim_surprise') {
        $us = $conn->prepare("SELECT name,phone,surprise_claimed FROM users WHERE email=?");
        $us->bind_param('s', $email); $us->execute();
        $u = $us->get_result()->fetch_assoc();
        if(!$u) err('User not found', 404);
        if($u['surprise_claimed']) err('Already claimed');
        $s1 = $conn->prepare("UPDATE users SET surprise_claimed=1 WHERE email=?");
        $s1->bind_param('s', $email); $s1->execute();
        $s2 = $conn->prepare("INSERT INTO surprise_claims (email,name,phone) VALUES (?,?,?)");
        $s2->bind_param('sss', $email, $u['name'], $u['phone']); $s2->execute();
        res(['message' => 'Claimed! Team 24h mein contact karegi.']);
    }

    if($action === 'submit_ticket') {
        $subject = $b['subject'] ?? '';
        $message = $b['message'] ?? '';
        if(!$subject || !$message) err('Subject and message required');
        $s = $conn->prepare("INSERT INTO support_tickets (email,subject,message) VALUES (?,?,?)");
        $s->bind_param('sss', $email, $subject, $message); $s->execute();
        res(['message' => 'Ticket submitted']);
    }

    if($action === 'get_tickets') {
        $s = $conn->prepare("SELECT * FROM support_tickets WHERE email=? ORDER BY created_at DESC");
        $s->bind_param('s', $email); $s->execute();
        $tickets = $s->get_result()->fetch_all(MYSQLI_ASSOC);
        foreach($tickets as &$t) {
            $r = $conn->prepare("SELECT * FROM ticket_replies WHERE ticket_id=? ORDER BY created_at");
            $r->bind_param('i', $t['id']); $r->execute();
            $t['replies'] = $r->get_result()->fetch_all(MYSQLI_ASSOC);
        }
        res($tickets);
    }

    err('Unknown action');
}
