<?php
require 'config.php';
$b = body();
$name  = trim($b['name']  ?? '');
$email = trim($b['email'] ?? '');
$phone = trim($b['phone'] ?? '');
$ref   = strtoupper(trim($b['ref_code'] ?? ''));

if(!$name || !$email) err('Name and email required');
if(!filter_var($email, FILTER_VALIDATE_EMAIL)) err('Invalid email');

$chk = $conn->prepare("SELECT id FROM users WHERE email=?");
$chk->bind_param('s', $email);
$chk->execute();
if($chk->get_result()->num_rows > 0) err('Email already registered');

$refCode    = strtoupper(substr(md5($email.time()), 0, 8));
$walletAddr = 'IK'.strtoupper(substr(md5($email.'wallet'), 0, 12));
$referredBy = null;

if($ref) {
    $rs = $conn->prepare("SELECT email FROM users WHERE referral_code=?");
    $rs->bind_param('s', $ref);
    $rs->execute();
    $row = $rs->get_result()->fetch_assoc();
    if($row) $referredBy = $row['email'];
}

$stmt = $conn->prepare("INSERT INTO users (name,email,phone,wallet_addr,referral_code,referred_by) VALUES (?,?,?,?,?,?)");
$stmt->bind_param('ssssss', $name, $email, $phone, $walletAddr, $refCode, $referredBy);
$stmt->execute();

// Referral bonuses
if($referredBy) {
    $s1 = $conn->prepare("UPDATE users SET wallet_cc=wallet_cc+25 WHERE email=?");
    $s1->bind_param('s', $email); $s1->execute();

    $s2 = $conn->prepare("UPDATE users SET wallet_cc=wallet_cc+50, ref_earned=ref_earned+50 WHERE email=?");
    $s2->bind_param('s', $referredBy); $s2->execute();

    $s3 = $conn->prepare("INSERT INTO referrals (referrer_email,referred_email) VALUES (?,?)");
    $s3->bind_param('ss', $referredBy, $email); $s3->execute();

    $msg = "$name ne aapke referral link se join kiya! +50 IK credited.";
    $s4 = $conn->prepare("INSERT INTO notifications (email,title,body,type) VALUES (?,'🎉 New Referral!',?,'success')");
    $s4->bind_param('ss', $referredBy, $msg); $s4->execute();
}

$newUser = $conn->prepare("SELECT id, name, email, phone, wallet_cc, wallet_addr, referral_code, ref_earned, avatar_url FROM users WHERE email=?");
$newUser->bind_param('s', $email); $newUser->execute();
$userData = $newUser->get_result()->fetch_assoc();
res(['message' => 'Registered successfully', 'user' => $userData]);
