<?php
require 'config.php';

$tests = [];

// 1. DB Connection
$tests[] = ['DB Connection', $conn->connect_error ? '❌ '.$conn->connect_error : '✅ Connected'];

// 2. Tables exist
$tables = ['users','settings','transactions','deposit_requests','withdrawal_requests','support_tickets','ticket_replies','notifications','admin_logs','surprise_claims','referrals'];
foreach($tables as $t) {
    $r = $conn->query("SHOW TABLES LIKE '$t'");
    $tests[] = ["Table: $t", $r->num_rows > 0 ? '✅ Exists' : '❌ MISSING'];
}

// 3. Settings rows
$s = $conn->query("SELECT * FROM settings");
$rows = $s ? $s->fetch_all(MYSQLI_ASSOC) : [];
$tests[] = ['Settings rows', count($rows) > 0 ? '✅ '.count($rows).' rows found' : '❌ Empty — run mysql_schema.sql'];

// 4. Users count
$u = $conn->query("SELECT COUNT(*) as cnt FROM users");
$cnt = $u ? $u->fetch_assoc()['cnt'] : 'error';
$tests[] = ['Users count', "ℹ️ $cnt users"];

echo '<style>body{font-family:monospace;background:#0a0a0f;color:#fff;padding:20px}
.ok{color:#22c55e}.err{color:#ef4444}.info{color:#f5c518}
table{border-collapse:collapse;width:100%;max-width:600px}
td{padding:8px 14px;border-bottom:1px solid #222}
</style>';
echo '<h2 style="color:#f5c518">🔧 IK Coin — DB Test</h2>';
echo '<table>';
foreach($tests as [$label, $result]) {
    $cls = str_contains($result,'✅') ? 'ok' : (str_contains($result,'❌') ? 'err' : 'info');
    echo "<tr><td>$label</td><td class='$cls'>$result</td></tr>";
}
echo '</table>';
echo '<br><small style="color:#4b5563">Delete this file after testing!</small>';
