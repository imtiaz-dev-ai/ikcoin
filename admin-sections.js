// ── SECTION HTML INJECTOR ─────────────────────────────────────────────────

function injectSections() {
  document.getElementById('adm-content').innerHTML = `

    <!-- DASHBOARD -->
    <div class="section active" id="sec-dashboard">
      <div class="sec-title"><i class="fa-solid fa-gauge"></i> Dashboard</div>
      <div class="stats-grid">
        <div class="stat-card buy">
          <div class="sc-icon buy"><i class="fa-solid fa-circle-plus"></i></div>
          <div class="sc-val buy" id="asTotalBuy">$0</div>
          <div class="sc-label">Buy Volume</div>
        </div>
        <div class="stat-card sell">
          <div class="sc-icon sell"><i class="fa-solid fa-circle-minus"></i></div>
          <div class="sc-val sell" id="asTotalSell">$0</div>
          <div class="sc-label">Sell Volume</div>
        </div>
        <div class="stat-card tx">
          <div class="sc-icon tx"><i class="fa-solid fa-list"></i></div>
          <div class="sc-val tx" id="asTxCount">0</div>
          <div class="sc-label">Transactions</div>
        </div>
        <div class="stat-card fee">
          <div class="sc-icon fee"><i class="fa-solid fa-percent"></i></div>
          <div class="sc-val fee" id="asTotalFees">$0</div>
          <div class="sc-label">Fees Collected</div>
        </div>
      </div>
      <div class="pending-grid">
        <div class="pending-card dep" onclick="showSection('deposits')">
          <div class="pending-val dep" id="pendingDepCount">0</div>
          <div class="pending-lbl">Pending<br>Deposits</div>
        </div>
        <div class="pending-card wit" onclick="showSection('withdrawals')">
          <div class="pending-val wit" id="pendingWitCount">0</div>
          <div class="pending-lbl">Pending<br>Withdrawals</div>
        </div>
        <div class="pending-card tix" onclick="showSection('support')">
          <div class="pending-val tix" id="openTicketsCount">0</div>
          <div class="pending-lbl">Open<br>Tickets</div>
        </div>
      </div>
      <div class="price-card">
        <div class="pc-top">
          <div>
            <div class="pc-label">Current IK Price</div>
            <div class="pc-price" id="currentPriceDisplay">$0.0100</div>
            <div class="pc-sub">App mein ±2% fluctuate hoti hai</div>
          </div>
        </div>
        <div class="pc-inp-wrap">
          <span>$</span>
          <input type="number" id="quickPrice" step="0.0001" placeholder="0.0100"/>
        </div>
        <button class="save-btn" onclick="quickSavePrice()">
          <i class="fa-solid fa-bolt"></i> Update Price
        </button>
        <div class="admin-msg" id="quickPriceMsg"></div>
      </div>
      <div class="admin-card">
        <div class="card-header">
          <div class="card-title"><i class="fa-solid fa-clock-rotate-left"></i> Recent Transactions</div>
          <div class="card-badge" id="txCountBadge">0 total</div>
        </div>
        <div class="tx-cards" id="dashTxCards">
          <div class="empty-state"><i class="fa-solid fa-inbox"></i><p>No transactions yet</p></div>
        </div>
      </div>
    </div>

    <!-- USERS -->
    <div class="section" id="sec-users">
      <div class="sec-title"><i class="fa-solid fa-users"></i> Users</div>
      <div class="users-stats">
        <div class="ug-card"><div class="ug-val" id="totalUsersCount">0</div><div class="ug-lbl">Total</div></div>
        <div class="ug-card"><div class="ug-val" style="color:var(--green)" id="activeUsersCount">0</div><div class="ug-lbl">Active</div></div>
        <div class="ug-card"><div class="ug-val" style="color:var(--orange)" id="refUsersCount">0</div><div class="ug-lbl">Referred</div></div>
      </div>
      <div class="user-list" id="userList">
        <div class="empty-state"><i class="fa-solid fa-users"></i><p>No users yet</p></div>
      </div>
    </div>

    <!-- SETTINGS -->
    <div class="section" id="sec-settings">
      <div class="sec-title"><i class="fa-solid fa-coins"></i> Coin Settings</div>
      <div class="admin-card">
        <div class="form-row">
          <div class="form-group"><label>Price (USD)</label><input type="number" id="aPrice" step="0.0001" placeholder="0.01"/></div>
          <div class="form-group"><label>Total Supply</label><input type="number" id="aSupply" placeholder="500000000"/></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Holders</label><input type="number" id="aHolders" placeholder="12450"/></div>
          <div class="form-group"><label>Network</label><input type="text" id="aNetwork" placeholder="BNB Smart Chain"/></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Fee (%)</label><input type="number" id="aFee" step="0.1" placeholder="0.5"/></div>
          <div class="form-group"><label>Referral (%)</label><input type="number" id="aRefPct" placeholder="10"/><small>Har buy/sell pe referrer ko</small></div>
        </div>
        <div class="form-group"><label>Binance Pay ID</label><input type="text" id="aBinanceId" placeholder="123456789"/></div>
        <button class="save-btn" onclick="saveCoin()"><i class="fa-solid fa-floppy-disk"></i> Save Settings</button>
        <div class="admin-msg" id="coinMsg"></div>
      </div>
      <div class="sec-title" style="margin-top:4px"><i class="fa-solid fa-chart-pie"></i> Tokenomics</div>
      <div class="admin-card">
        <div class="form-row">
          <div class="form-group"><label>Public Sale (%)</label><input type="number" id="tToken" placeholder="40"/></div>
          <div class="form-group"><label>Team (%)</label><input type="number" id="tProd" placeholder="20"/></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Development (%)</label><input type="number" id="tProgress" placeholder="15"/></div>
          <div class="form-group"><label>Marketing (%)</label><input type="number" id="tOther" placeholder="15"/></div>
        </div>
        <div class="form-group"><label>Reserve (%)</label><input type="number" id="tReserve" placeholder="10"/></div>
        <button class="save-btn" onclick="saveTokenomics()"><i class="fa-solid fa-floppy-disk"></i> Save Tokenomics</button>
        <div class="admin-msg" id="tokenMsg"></div>
      </div>
      <div class="sec-title" style="margin-top:4px"><i class="fa-solid fa-map-location-dot"></i> Roadmap</div>
      <div class="admin-card">
        <div class="form-row">
          <div class="form-group"><label>Phase 1 Title</label><input type="text" id="r1t" placeholder="Phase 1 — Launch"/></div>
          <div class="form-group"><label>Phase 1 Desc</label><textarea id="r1d" placeholder="Token creation..."></textarea></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Phase 2 Title</label><input type="text" id="r2t" placeholder="Phase 2 — Listing"/></div>
          <div class="form-group"><label>Phase 2 Desc</label><textarea id="r2d" placeholder="PancakeSwap..."></textarea></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Phase 3 Title</label><input type="text" id="r3t" placeholder="Phase 3 — DeFi"/></div>
          <div class="form-group"><label>Phase 3 Desc</label><textarea id="r3d" placeholder="Staking..."></textarea></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Phase 4 Title</label><input type="text" id="r4t" placeholder="Phase 4 — Global"/></div>
          <div class="form-group"><label>Phase 4 Desc</label><textarea id="r4d" placeholder="CEX listings..."></textarea></div>
        </div>
        <button class="save-btn" onclick="saveRoadmap()"><i class="fa-solid fa-floppy-disk"></i> Save Roadmap</button>
        <div class="admin-msg" id="roadMsg"></div>
      </div>
    </div>

    <!-- TRANSACTIONS -->
    <div class="section" id="sec-transactions">
      <div class="card-header">
        <div class="sec-title"><i class="fa-solid fa-clock-rotate-left"></i> Transactions</div>
        <button class="save-btn danger-btn sm-btn" onclick="clearTx()"><i class="fa-solid fa-trash"></i> Clear</button>
      </div>
      <div class="tx-cards" id="allTxCards">
        <div class="empty-state"><i class="fa-solid fa-inbox"></i><p>No transactions yet</p></div>
      </div>
    </div>

    <!-- CLAIMS -->
    <div class="section" id="sec-claims">
      <div class="card-header">
        <div class="sec-title"><i class="fa-solid fa-gift"></i> Surprise Claims</div>
        <div class="card-badge" id="claimsCountBadge">0 claims</div>
      </div>
      <div id="claimsList" class="list-wrap">
        <div class="empty-state"><i class="fa-solid fa-gift"></i><p>No claims yet</p></div>
      </div>
    </div>

    <!-- DEPOSITS -->
    <div class="section" id="sec-deposits">
      <div class="sec-title"><i class="fa-solid fa-circle-plus"></i> Deposit Requests</div>
      <div id="depositsList" class="list-wrap">
        <div class="empty-state"><i class="fa-solid fa-inbox"></i><p>No deposit requests</p></div>
      </div>
    </div>

    <!-- WITHDRAWALS -->
    <div class="section" id="sec-withdrawals">
      <div class="sec-title"><i class="fa-solid fa-money-bill-wave"></i> Withdrawal Requests</div>
      <div id="withdrawalsList" class="list-wrap">
        <div class="empty-state"><i class="fa-solid fa-inbox"></i><p>No withdrawal requests</p></div>
      </div>
    </div>

    <!-- SUPPORT -->
    <div class="section" id="sec-support">
      <div class="sec-title"><i class="fa-solid fa-headset"></i> Support Tickets</div>
      <div id="ticketsList" class="list-wrap">
        <div class="empty-state"><i class="fa-solid fa-headset"></i><p>No tickets yet</p></div>
      </div>
    </div>

    <!-- LOGS -->
    <div class="section" id="sec-logs">
      <div class="sec-title"><i class="fa-solid fa-scroll"></i> Activity Logs</div>
      <div id="logsList" class="list-wrap">
        <div class="empty-state"><i class="fa-solid fa-scroll"></i><p>No activity yet</p></div>
      </div>
    </div>
  `;
}
