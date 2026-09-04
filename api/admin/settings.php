<?php
require '../config.php';
$method = $_SERVER['REQUEST_METHOD'];

// GET all settings + stats + claims + logs + tickets
if($method === 'GET') {
    $type = $_GET['type'] ?? 'settings';

    if($type === 'settings') {
        $res = $conn->query("SELECT * FROM settings");
        $s = [];
        while($row = $res->fetch_assoc()) $s[$row['key']] = $row['value'];
        res($s);
    }

    if($type === 'stats') {
        $txs   = $conn->query("SELECT type,usd,fee FROM transactions")->fetch_all(MYSQLI_ASSOC);
        $users = $conn->query("SELECT COUNT(*) as cnt FROM users")->fetch_assoc()['cnt'];
        $pDep  = $conn->query("SELECT COUNT(*) as cnt FROM deposit_requests WHERE status='pending'")->fetch_assoc()['cnt'];
        $pWit  = $conn->query("SELECT COUNT(*) as cnt FROM withdrawal_requests WHERE status='pending'")->fetch_assoc()['cnt'];
        $oTix  = $conn->query("SELECT COUNT(*) as cnt FROM support_tickets WHERE status!='closed'")->fetch_assoc()['cnt'];
        $buyVol = $sellVol = $fees = 0;
        foreach($txs as $t) {
            $u = floatval($t['usd']); $f = floatval($t['fee']);
            if(in_array($t['type'],['BUY','DEPOSIT'])) $buyVol += $u; else $sellVol += $u;
            $fees += $f;
        }
        res(['buy_volume'=>round($buyVol,2),'sell_volume'=>round($sellVol,2),'tx_count'=>count($txs),'fees_collected'=>round($fees,2),'total_users'=>$users,'pending_deposits'=>$pDep,'pending_withdrawals'=>$pWit,'open_tickets'=>$oTix]);
    }

    if($type === 'transactions') {
        $res = $conn->query("SELECT * FROM transactions ORDER BY created_at DESC LIMIT 200");
        res($res->fetch_all(MYSQLI_ASSOC));
    }

    if($type === 'claims') {
        $res = $conn->query("SELECT * FROM surprise_claims ORDER BY created_at DESC");
        res($res->fetch_all(MYSQLI_ASSOC));
    }

    if($type === 'logs') {
        $res = $conn->query("SELECT * FROM admin_logs ORDER BY created_at DESC LIMIT 100");
        res($res->fetch_all(MYSQLI_ASSOC));
    }

    if($type === 'tickets') {
        $tickets = $conn->query("SELECT * FROM support_tickets ORDER BY created_at DESC")->fetch_all(MYSQLI_ASSOC);
        foreach($tickets as &$t) {
            $r = $conn->prepare("SELECT * FROM ticket_replies WHERE ticket_id=? ORDER BY created_at");
            $r->bind_param('i', $t['id']); $r->execute();
            $t['replies'] = $r->get_result()->fetch_all(MYSQLI_ASSOC);
        }
        res($tickets);
    }
}

// POST — save settings / ticket reply / close ticket / clear txns
if($method === 'POST') {
    $b      = body();
    $action = $b['action'] ?? '';

    if($action === 'save_settings') {
        $pairs = $b['settings'] ?? [];
        foreach($pairs as $key => $val) {
            $s = $conn->prepare("REPLACE INTO settings (`key`,value) VALUES (?,?)");
            $s->bind_param('ss', $key, $val); $s->execute();
        }
        adminLog($conn, 'Settings Updated');
        res(['message' => 'Settings saved']);
    }

    if($action === 'ticket_reply') {
        $tid = intval($b['ticket_id'] ?? 0);
        $msg = $b['message'] ?? '';
        $email = $b['email'] ?? '';
        if(!$tid || !$msg) err('ticket_id and message required');
        $s = $conn->prepare("INSERT INTO ticket_replies (ticket_id,sender,message) VALUES (?,'admin',?)");
        $s->bind_param('is', $tid, $msg); $s->execute();
        $u = $conn->prepare("UPDATE support_tickets SET status='replied' WHERE id=?");
        $u->bind_param('i', $tid); $u->execute();
        if($email) {
            $n = $conn->prepare("INSERT INTO notifications (email,title,body,type) VALUES (?,'💬 Support Reply','Admin ne aapki ticket ka jawab de diya hai.','info')");
            $n->bind_param('s', $email); $n->execute();
        }
        adminLog($conn, 'Ticket Replied', "Ticket #$tid");
        res(['message' => 'Reply sent']);
    }

    if($action === 'close_ticket') {
        $tid   = intval($b['ticket_id'] ?? 0);
        $email = $b['email'] ?? '';
        $u = $conn->prepare("UPDATE support_tickets SET status='closed' WHERE id=?");
        $u->bind_param('i', $tid); $u->execute();
        if($email) {
            $n = $conn->prepare("INSERT INTO notifications (email,title,body,type) VALUES (?,'🔒 Ticket Closed','Aapki support ticket close kar di gayi hai.','info')");
            $n->bind_param('s', $email); $n->execute();
        }
        adminLog($conn, 'Ticket Closed', "Ticket #$tid");
        res(['message' => 'Ticket closed']);
    }

    if($action === 'clear_transactions') {
        $conn->query("DELETE FROM transactions");
        adminLog($conn, 'Transactions Cleared', 'All transactions deleted');
        res(['message' => 'Transactions cleared']);
    }
}
