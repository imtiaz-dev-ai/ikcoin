-- IK COIN — MySQL Schema (XAMPP / phpMyAdmin)
-- phpMyAdmin mein ikcoin database banao phir yeh run karo

CREATE DATABASE IF NOT EXISTS ikcoin CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ikcoin;

CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) UNIQUE NOT NULL,
  phone         VARCHAR(20),
  wallet_cc     DOUBLE DEFAULT 0,
  wallet_addr   VARCHAR(50),
  referral_code VARCHAR(20) UNIQUE,
  ref_earned    DOUBLE DEFAULT 0,
  referred_by   VARCHAR(150),
  avatar_url    TEXT,
  surprise_claimed TINYINT(1) DEFAULT 0,
  status        VARCHAR(20) DEFAULT 'active',
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS otps (
  email      VARCHAR(150) PRIMARY KEY,
  code       VARCHAR(10) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  email      VARCHAR(150),
  type       VARCHAR(20) NOT NULL,
  cc         DOUBLE DEFAULT 0,
  usd        DOUBLE DEFAULT 0,
  fee        DOUBLE DEFAULT 0,
  method     VARCHAR(50) DEFAULT 'Binance',
  extra      TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS referrals (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  referrer_email VARCHAR(150),
  referred_email VARCHAR(150),
  join_bonus     DOUBLE DEFAULT 50,
  has_bought     TINYINT(1) DEFAULT 0,
  total_earned   DOUBLE DEFAULT 0,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
  `key`  VARCHAR(50) PRIMARY KEY,
  value  TEXT NOT NULL
);

INSERT IGNORE INTO settings (`key`, value) VALUES
  ('price',      '0.01'),
  ('supply',     '500000000'),
  ('holders',    '12450'),
  ('network',    'BNB Smart Chain'),
  ('fee',        '0.5'),
  ('refSellPct', '10'),
  ('binanceId',  '123456789');

CREATE TABLE IF NOT EXISTS surprise_claims (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  email      VARCHAR(150),
  name       VARCHAR(100),
  phone      VARCHAR(20),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS deposit_requests (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  email       VARCHAR(150),
  amount_usd  DOUBLE NOT NULL,
  txid        VARCHAR(200) NOT NULL,
  status      VARCHAR(20) DEFAULT 'pending',
  cc_credited DOUBLE DEFAULT 0,
  note        TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  email       VARCHAR(150),
  amount_cc   DOUBLE NOT NULL,
  amount_usd  DOUBLE NOT NULL,
  binance_id  VARCHAR(100) NOT NULL,
  status      VARCHAR(20) DEFAULT 'pending',
  note        TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  email      VARCHAR(150),
  subject    VARCHAR(200) NOT NULL,
  message    TEXT NOT NULL,
  status     VARCHAR(20) DEFAULT 'open',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ticket_replies (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  ticket_id  INT,
  sender     VARCHAR(20) NOT NULL,
  message    TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  email      VARCHAR(150),
  title      VARCHAR(200) NOT NULL,
  body       TEXT NOT NULL,
  type       VARCHAR(20) DEFAULT 'info',
  is_read    TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_logs (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  action     VARCHAR(200) NOT NULL,
  detail     TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
