<?php
require '../config.php';
$method = $_SERVER['REQUEST_METHOD'];

// GET all deposits
if($method === 'GET') {
    $res  = $conn->query("SELECT * FROM deposit_requests ORDER BY created_at DESC");
    res($res->fetch_all(MYSQLI_ASSOC));
}

// POST — approve or reject
if($method === 'POST') {
    $b      = body();
    $id     = intval($b['id']     ?? 0);
    $action = $b['action'] ?? '';
    if(!$id || !$action) err('ID and action required');

    $rs = $conn->prepare("SELECT * FROM deposit_requests WHERE id=?");
    $rs->bind_param('i', $id); $rs->execute();
    $r = $rs->get_result()->fetch_assoc();
    if(!$r) err('Request not found', 404);
    if($r['status'] !== 'pending') err('Already processed');

    if($action === 'approve') {
        $ps = $conn->prepare("SELECT value FROM settings WHERE `key`='price'");
        $ps->execute();
        $price = floatval($ps->get_result()->fetch_assoc()['value'] ?? 0.01);
        $fee   = $r['amount_usd'] * 0.005;
        $cc    = ($r['amount_usd'] - $fee) / $price;

        // Credit wallet
        $uw = $conn->prepare("UPDATE users SET wallet_cc=wallet_cc+? WHERE email=?");
        $uw->bind_param('ds', $cc, $r['email']); $uw->execute();

        // Save transaction
        $tx = $conn->prepare("INSERT INTO transactions (email,type,cc,usd,fee,method,extra) VALUES (?,?,?,?,?,?,?)");
        $tx_method = 'Binance'; $extra = 'TxID:'.$r['txid'];
        $tx_type = 'DEPOSIT';
        $tx->bind_param('ssdddss', $r['email'], $tx_type, $cc, $r['amount_usd'], $fee, $tx_method, $extra);
        $tx->execute();

        // Update request
        $up = $conn->prepare("UPDATE deposit_requests SET status='approved', cc_credited=? WHERE id=?");
        $up->bind_param('di', $cc, $id); $up->execute();

        // Notify user
        $amt = $r['amount_usd'];
        $msg = "\$$amt deposit approved! ".round($cc,2)." IK credited.";
        $n = $conn->prepare("INSERT INTO notifications (email,title,body,type) VALUES (?,'✅ Deposit Approved',?,'success')");
        $n->bind_param('ss', $r['email'], $msg); $n->execute();

        adminLog($conn, 'Deposit Approved', "User: {$r['email']} | \${$r['amount_usd']} | ".round($cc,2)." IK");
        res(['message' => 'Deposit approved', 'cc_credited' => round($cc,2)]);

    } else {
        $up = $conn->prepare("UPDATE deposit_requests SET status='rejected' WHERE id=?");
        $up->bind_param('i', $id); $up->execute();

        $amt = $r['amount_usd'];
        $msg = "\$$amt deposit rejected.";
        $n = $conn->prepare("INSERT INTO notifications (email,title,body,type) VALUES (?,'❌ Deposit Rejected',?,'error')");
        $n->bind_param('ss', $r['email'], $msg); $n->execute();

        adminLog($conn, 'Deposit Rejected', "User: {$r['email']} | \${$r['amount_usd']}");
        res(['message' => 'Deposit rejected']);
    }
}
