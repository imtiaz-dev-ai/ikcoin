<?php
require 'config.php';
$b     = body();
$email = trim($b['email'] ?? '');
$code  = trim($b['otp']   ?? '');
if(!$email || !$code) err('Email and OTP required');

$stmt = $conn->prepare("SELECT code, expires_at FROM otps WHERE email=?");
$stmt->bind_param('s', $email);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();

if(!$row) err('OTP not found. Request a new one.');
if(strtotime($row['expires_at']) < time()) err('OTP expired. Request a new one.');
if($row['code'] !== $code) err('Wrong OTP.');

// Delete used OTP
$conn->prepare("DELETE FROM otps WHERE email=?")->bind_param('s',$email) && $conn->execute();
$d = $conn->prepare("DELETE FROM otps WHERE email=?");
$d->bind_param('s', $email); $d->execute();

// Get user data
$us = $conn->prepare("SELECT * FROM users WHERE email=?");
$us->bind_param('s', $email);
$us->execute();
$user = $us->get_result()->fetch_assoc();

res(['message' => 'OTP verified', 'user' => $user]);
