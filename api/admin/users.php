<?php
require '../config.php';
$method = $_SERVER['REQUEST_METHOD'];

// GET all users
if($method === 'GET') {
    $res = $conn->query("SELECT * FROM users ORDER BY created_at DESC");
    $users = $res->fetch_all(MYSQLI_ASSOC);

    $stats = [
        'total'    => count($users),
        'active'   => count(array_filter($users, fn($u) => ($u['status']??'active') === 'active')),
        'referred' => count(array_filter($users, fn($u) => !empty($u['referred_by']))),
    ];
    res(['users' => $users, 'stats' => $stats]);
}

// POST — update status
if($method === 'POST') {
    $b      = body();
    $email  = $b['email']  ?? '';
    $status = $b['status'] ?? '';
    if(!$email || !$status) err('Email and status required');

    $s = $conn->prepare("UPDATE users SET status=? WHERE email=?");
    $s->bind_param('ss', $status, $email); $s->execute();

    $msgs = [
        'active'    => ['✅ Account Restored',   'Aapka account dobara active ho gaya hai.',  'success'],
        'suspended' => ['⚠️ Account Suspended', 'Aapka account suspend kar diya gaya hai.',  'error'],
        'banned'    => ['🚫 Account Banned',     'Aapka account ban ho gaya hai.',            'error'],
    ];
    if(isset($msgs[$status])) {
        [$title, $body, $type] = $msgs[$status];
        $n = $conn->prepare("INSERT INTO notifications (email,title,body,type) VALUES (?,?,?,?)");
        $n->bind_param('ssss', $email, $title, $body, $type); $n->execute();
    }

    adminLog($conn, "User ".ucfirst($status), "User: $email");
    res(['message' => "User $status"]);
}
