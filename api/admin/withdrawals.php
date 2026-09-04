<?php
require '../config.php';
$method = $_SERVER['REQUEST_METHOD'];

// GET all withdrawals
if($method === 'GET') {
    $res = $conn->query("SELECT * FROM withdrawal_requests ORDER BY created_at DESC");
    res($res->fetch_all(MYSQLI_ASSOC));
}

// POST — approve or reject
if($method === 'POST') {
    $b      = body();
    $id     = intval($b['id']     ?? 0);
    $action = $b['action'] ?? '';
    if(!$id || !$action) err('ID and action required');

    $rs = $conn->prepare("SELECT * FROM withdrawal_requests WHERE id=?");
    $rs->bind_param('i', $id); $rs->execute();
    $r = $rs->get_result()->fetch_assoc();
    if(!$r) err('Request not found', 404);
    if($r['status'] !== 'pending') err('Already processed');

    if($action === 'approve') {
        $fee = $r['amount_usd'] * 0.005;
        $tx  = $conn->prepare("INSERT INTO transactions (email,type,cc,usd,fee,method,extra) VALUES (?,?,?,?,?,?,?)");
        $tx_method = 'Binance'; $extra = 'Binance:'.$r['binance_id'];
        $tx_type = 'SELL';
        $tx->bind_param('ssdddss', $r['email'], $tx_type, $r['amount_cc'], $r['amount_usd'], $fee, $tx_method, $extra);
        $tx->execute();

        $up = $conn->prepare("UPDATE withdrawal_requests SET status='approved' WHERE id=?");
        $up->bind_param('i', $id); $up->execute();

        $msg = "{$r['amount_cc']} IK withdrawal approved! \${$r['amount_usd']} USDT bheja ja raha hai.";
        $n = $conn->prepare("INSERT INTO notifications (email,title,body,type) VALUES (?,'✅ Withdrawal Approved',?,'success')");
        $n->bind_param('ss', $r['email'], $msg); $n->execute();

        adminLog($conn, 'Withdrawal Approved', "User: {$r['email']} | {$r['amount_cc']} IK");
        res(['message' => 'Withdrawal approved']);

    } else {
        // Refund balance
        $uw = $conn->prepare("UPDATE users SET wallet_cc=wallet_cc+? WHERE email=?");
        $uw->bind_param('ds', $r['amount_cc'], $r['email']); $uw->execute();

        $up = $conn->prepare("UPDATE withdrawal_requests SET status='rejected' WHERE id=?");
        $up->bind_param('i', $id); $up->execute();

        $msg = "{$r['amount_cc']} IK withdrawal rejected. Balance wapas credit ho gaya.";
        $n = $conn->prepare("INSERT INTO notifications (email,title,body,type) VALUES (?,'❌ Withdrawal Rejected',?,'error')");
        $n->bind_param('ss', $r['email'], $msg); $n->execute();

        adminLog($conn, 'Withdrawal Rejected', "User: {$r['email']} | {$r['amount_cc']} IK refunded");
        res(['message' => 'Withdrawal rejected, balance refunded']);
    }
}
