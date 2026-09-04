<?php
require 'config.php';
$b          = body();
$email      = trim($b['email']      ?? '');
$amount_cc  = floatval($b['amount_cc']  ?? 0);
$binance_id = trim($b['binance_id'] ?? '');

if(!$email || $amount_cc <= 0 || !$binance_id) err('Email, amount, binance_id required');

$us = $conn->prepare("SELECT wallet_cc FROM users WHERE email=?");
$us->bind_param('s', $email); $us->execute();
$user = $us->get_result()->fetch_assoc();
if(!$user) err('User not found', 404);
if($user['wallet_cc'] < $amount_cc) err('Insufficient balance');

// Get price
$ps = $conn->prepare("SELECT value FROM settings WHERE `key`='price'");
$ps->execute();
$price     = floatval($ps->get_result()->fetch_assoc()['value'] ?? 0.01);
$amount_usd = round($amount_cc * $price, 2);

// Hold balance
$uw = $conn->prepare("UPDATE users SET wallet_cc=wallet_cc-? WHERE email=?");
$uw->bind_param('ds', $amount_cc, $email); $uw->execute();

$stmt = $conn->prepare("INSERT INTO withdrawal_requests (email,amount_cc,amount_usd,binance_id) VALUES (?,?,?,?)");
$stmt->bind_param('sdds', $email, $amount_cc, $amount_usd, $binance_id);
$stmt->execute();

$n = $conn->prepare("INSERT INTO notifications (email,title,body,type) VALUES (?,'⏳ Withdrawal Request Submitted',?,'info')");
$msg = "$amount_cc IK withdrawal request received. Admin review karega.";
$n->bind_param('ss', $email, $msg); $n->execute();

res(['message' => 'Withdrawal request submitted']);
