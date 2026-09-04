# 🪙 IK Coin Wallet — Complete Project Documentation

## 📁 Project Structure

```
cryptocoin/
├── index.html          → Main user app (wallet, trade, team, profile)
├── admin.html          → Admin panel (dashboard, users, settings, txns)
├── script.js           → Frontend logic (auth, trade, referral, wallet)
├── admin.js            → Admin panel logic
├── style.css           → Full app styling (dark gold theme)
├── api.js              → Backend API connector (frontend ↔ backend)
├── firebase-config.js  → (purana — ab use nahi hota)
│
└── backend/
    ├── main.py         → FastAPI app entry point
    ├── db.py           → Supabase connection
    ├── .env            → Secret keys (Supabase URL + Key)
    ├── requirements.txt→ Python dependencies
    ├── schema.sql      → Supabase database tables
    └── routes/
        ├── auth.py         → Register, Login, OTP, Ref code check
        ├── users.py        → Wallet, Avatar, Referrals, Surprise claim
        ├── transactions.py → BUY/SELL/DEPOSIT/SHARE + referral commission
        ├── settings.py     → Coin price, fee, Binance ID etc
        └── admin.py        → Stats, all users, claims, clear txns
```

---

## 🗄️ Supabase Database

**Project URL:** `https://syjjnvbtxwbzmzeamjht.supabase.co`

### Tables

| Table | Kaam |
|-------|------|
| `users` | Sare registered users, wallet balance, referral code |
| `otps` | Temporary OTP codes (10 min expire) |
| `transactions` | Har BUY/SELL/DEPOSIT/SHARE record |
| `referrals` | Referrer → Referred relationship + earnings |
| `settings` | Admin ke coin settings (price, fee, binance ID etc) |
| `surprise_claims` | 1M IK sell reward claims |

### Schema Run Karna
1. [supabase.com](https://supabase.com) → apna project kholo
2. Left sidebar → **SQL Editor** → New Query
3. `backend/schema.sql` ka sara content paste karo
4. **Run** dabao ✅

---

## ⚙️ Backend Setup (Python + FastAPI)

### Step 1 — Python Install
- [python.org/downloads](https://python.org/downloads) se Python 3.11+ download karo
- Install karte waqt **"Add Python to PATH"** zaroor tick karo

### Step 2 — Dependencies Install
```bash
cd cryptocoin/backend
py -m pip install -r requirements.txt
```

### Step 3 — .env File
`backend/.env` file already configured hai:
```
SUPABASE_URL=https://syjjnvbtxwbzmzeamjht.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGci...
OTP_EXPIRE_MINUTES=10
```

### Step 4 — Backend Run Karo
```bash
cd cryptocoin/backend
py -m uvicorn main:app --reload
```
Server chalega: `http://localhost:8000`
API Docs: `http://localhost:8000/docs`

---

## 🌐 Frontend Setup

### index.html mein api.js add karo
`index.html` mein `script.js` se pehle yeh line add karo:
```html
<script src="api.js"></script>
```

### API Base URL change karna ho toh
`api.js` ki pehli line:
```js
const API_BASE = 'http://localhost:8000'; // production URL yahan daalo
```

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint | Kaam |
|--------|----------|------|
| POST | `/auth/send-otp` | Login OTP bhejo |
| POST | `/auth/register` | Naya user register |
| POST | `/auth/verify-otp` | OTP verify karo |
| GET | `/auth/check-ref/{code}` | Referral code valid hai? |

### Users
| Method | Endpoint | Kaam |
|--------|----------|------|
| GET | `/users/{email}` | User data lo |
| PUT | `/users/wallet` | Wallet balance update |
| PUT | `/users/avatar` | Profile photo update |
| GET | `/users/{email}/referrals` | Referral list |
| POST | `/users/claim-surprise` | Surprise reward claim |

### Transactions
| Method | Endpoint | Kaam |
|--------|----------|------|
| POST | `/transactions/` | Transaction save karo |
| GET | `/transactions/{email}` | User ki transactions |
| GET | `/transactions/` | Sari transactions (admin) |
| POST | `/transactions/share` | Coins share karo |

### Settings
| Method | Endpoint | Kaam |
|--------|----------|------|
| GET | `/settings/` | Sari settings lo |
| PUT | `/settings/bulk` | Multiple settings save |

### Admin
| Method | Endpoint | Kaam |
|--------|----------|------|
| GET | `/admin/stats` | Dashboard stats |
| GET | `/admin/users` | Sare users |
| GET | `/admin/claims` | Surprise claims |
| DELETE | `/admin/transactions` | Sari transactions clear |

---

## 💰 Business Logic

### Referral System
- Koi referral link se join kare → **Referrer ko +50 IK** (join bonus)
- Naya user referral se aaye → **Khud ko +25 IK** (self bonus)
- Referred user BUY kare → **Referrer ko 10% IK commission**
- Referred user SELL kare → **Referrer ko 10% IK commission**

### Trading Fees
- Har BUY/SELL/DEPOSIT pe **0.5% fee**
- Coins SHARE karne pe **0.1% network fee**

### Surprise Reward
- User 1,000,000 IK sell kare → Reward claim button unlock
- Admin ko notification milti hai → Team contact karti hai

### Price System
- Admin dashboard se price set hoti hai
- App mein ±2% fluctuation hoti hai automatically

---

## 📱 Frontend Pages

### User App (index.html)
| Page | Kaam |
|------|------|
| Home | Live price, chart, market ticker, lock/unlock trading |
| Wallet | Balance, deposit, sell, share, receive, transaction history |
| Trade | BUY via Binance Pay, SELL to Binance |
| Team | Referral code, link share, referral list, community links |
| Profile | Avatar, surprise reward progress, settings menu |

### Admin Panel (admin.html)
| Section | Kaam |
|---------|------|
| Dashboard | Stats cards, live price update, recent transactions |
| Users | All users list with balance, phone, ref code |
| Settings | Coin price, supply, fee, referral %, Binance ID, tokenomics, roadmap |
| Transactions | All transactions with type, amount, user |
| Claims | Surprise reward claim requests |

---

## 📧 EmailJS Setup (OTP Email)

1. [emailjs.com](https://emailjs.com) pe account banao
2. Email Service add karo (Gmail)
3. Template banao with variables: `{{to_email}}`, `{{otp_code}}`, `{{to_name}}`
4. `script.js` ki top mein update karo:
```js
const EMAILJS_PUBLIC_KEY  = 'your_public_key';
const EMAILJS_SERVICE_ID  = 'your_service_id';
const EMAILJS_TEMPLATE_ID = 'your_template_id';
```

---

## 🚀 Production Deploy

### Backend — Railway / Render
1. [railway.app](https://railway.app) ya [render.com](https://render.com) pe account banao
2. GitHub pe code push karo
3. New service → GitHub repo connect karo
4. Environment variables add karo (`.env` ki values)
5. Start command: `uvicorn main:app --host 0.0.0.0 --port 8000`

### Frontend — Netlify / Vercel
1. [netlify.com](https://netlify.com) pe drag & drop karo `cryptocoin/` folder
2. `api.js` mein `API_BASE` ko production URL se update karo

---

## 🔑 Important Credentials

| Cheez | Value |
|-------|-------|
| Supabase URL | `https://syjjnvbtxwbzmzeamjht.supabase.co` |
| Binance ID | `123456789` (admin.html se update karo) |
| Default Coin Price | `$0.01` |
| Default Supply | `500,000,000 IK` |
| Trading Fee | `0.5%` |
| Referral Commission | `10%` |
| Join Bonus | `50 IK` |
| Self Bonus | `25 IK` |
| Surprise Target | `1,000,000 IK sold` |

---

## ❗ Important Notes

- `.env` file kabhi GitHub pe push mat karo (secret keys hain)
- Production mein `dev_otp` response se hata dena (`auth.py` mein)
- Supabase `service_role` key sirf backend mein use karo, frontend mein nahi
- Admin panel ka link profile page se accessible hai — production mein password protect karo
