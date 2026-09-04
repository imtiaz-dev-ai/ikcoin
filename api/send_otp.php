<?php
require 'config.php';
$b     = body();
$email = trim($b['email'] ?? '');
if(!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) err('Invalid email');

$chk = $conn->prepare("SELECT name FROM users WHERE email=?");
$chk->bind_param('s', $email);
$chk->execute();
$user = $chk->get_result()->fetch_assoc();
if(!$user) err('Email not registered');

$otp     = strval(rand(100000, 999999));
$expires = date('Y-m-d H:i:s', strtotime('+10 minutes'));

$stmt = $conn->prepare("REPLACE INTO otps (email,code,expires_at) VALUES (?,?,?)");
$stmt->bind_param('sss', $email, $otp, $expires);
$stmt->execute();

// Send email via PHP mail
$subject = 'IK Coin — Your OTP Code';
$body    = "Hello {$user['name']},\n\nYour OTP code is: $otp\n\nValid for 10 minutes.\n\nIK Coin Team";
$headers = "From: noreply@discountpackage.top\r\nContent-Type: text/plain; charset=UTF-8";
mail($email, $subject, $body, $headers);

res(['message' => 'OTP sent', 'dev_otp' => $otp]); // dev_otp production mein hata dena
