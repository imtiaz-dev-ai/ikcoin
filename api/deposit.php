<?php
require 'config.php';
$b     = body();
$email = trim($b['email']      ?? '');
$amt   = floatval($b['amount_usd'] ?? 0);
$txid  = trim($b['txid']       ?? '');

if(!$email || $amt <= 0 || !$txid) err('Email, amount, txid required');

$stmt = $conn->prepare("INSERT INTO deposit_requests (email,amount_usd,txid) VALUES (?,?,?)");
$stmt->bind_param('sds', $email, $amt, $txid);
$stmt->execute();

$n = $conn->prepare("INSERT INTO notifications (email,title,body,type) VALUES (?,'⏳ Deposit Request Submitted',?,'info')");
$msg = "$$amt USDT deposit request received. Admin review karega.";
$n->bind_param('ss', $email, $msg);
$n->execute();

res(['message' => 'Deposit request submitted']);
