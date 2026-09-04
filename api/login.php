<?php
require 'config.php';
$b     = body();
$email = trim($b['email'] ?? '');
if(!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) err('Invalid email');

$stmt = $conn->prepare("SELECT id, name, email, phone, wallet_cc, wallet_addr, referral_code, ref_earned, avatar_url, surprise_claimed, status FROM users WHERE email=?");
$stmt->bind_param('s', $email);
$stmt->execute();
$user = $stmt->get_result()->fetch_assoc();

if(!$user) err('Email not registered. Please register first.');
if(($user['status'] ?? 'active') === 'banned') err('Account banned. Contact support.');
if(($user['status'] ?? 'active') === 'suspended') err('Account suspended. Contact support.');

res(['message' => 'Login successful', 'user' => $user]);
