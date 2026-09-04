from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from db import supabase

router = APIRouter()


def add_notification(email: str, title: str, body: str, ntype: str = "info"):
    supabase.table("notifications").insert({
        "email": email, "title": title, "body": body, "type": ntype
    }).execute()


def admin_log(action: str, detail: str = ""):
    supabase.table("admin_logs").insert({"action": action, "detail": detail}).execute()


# ── SUBMIT DEPOSIT REQUEST ────────────────────────────────────────────────
class DepositReq(BaseModel):
    email: EmailStr
    amount_usd: float
    txid: str

@router.post("/deposit")
def submit_deposit(body: DepositReq):
    if body.amount_usd <= 0:
        raise HTTPException(400, "Invalid amount")
    supabase.table("deposit_requests").insert({
        "email": body.email,
        "amount_usd": body.amount_usd,
        "txid": body.txid,
    }).execute()
    add_notification(body.email, "⏳ Deposit Request Submitted",
                     f"${body.amount_usd} USDT deposit request received. Admin review karega.", "info")
    return {"message": "Deposit request submitted"}


# ── SUBMIT WITHDRAWAL REQUEST ─────────────────────────────────────────────
class WithdrawReq(BaseModel):
    email: EmailStr
    amount_cc: float
    binance_id: str

@router.post("/withdraw")
def submit_withdraw(body: WithdrawReq):
    user = supabase.table("users").select("wallet_cc").eq("email", body.email).single().execute()
    if not user.data:
        raise HTTPException(404, "User nahi mila")
    if (user.data["wallet_cc"] or 0) < body.amount_cc:
        raise HTTPException(400, "Insufficient balance")

    settings = supabase.table("settings").select("value").eq("key", "price").single().execute()
    price = float(settings.data["value"]) if settings.data else 0.01
    amount_usd = round(body.amount_cc * price, 2)

    # Hold balance
    supabase.table("users").update({
        "wallet_cc": user.data["wallet_cc"] - body.amount_cc
    }).eq("email", body.email).execute()

    supabase.table("withdrawal_requests").insert({
        "email": body.email,
        "amount_cc": body.amount_cc,
        "amount_usd": amount_usd,
        "binance_id": body.binance_id,
    }).execute()
    add_notification(body.email, "⏳ Withdrawal Request Submitted",
                     f"{body.amount_cc} IK withdrawal request received. Admin review karega.", "info")
    return {"message": "Withdrawal request submitted"}


# ── GET USER REQUESTS ─────────────────────────────────────────────────────
@router.get("/deposits/{email}")
def get_deposits(email: str):
    res = supabase.table("deposit_requests").select("*").eq("email", email).order("created_at", desc=True).execute()
    return res.data or []

@router.get("/withdrawals/{email}")
def get_withdrawals(email: str):
    res = supabase.table("withdrawal_requests").select("*").eq("email", email).order("created_at", desc=True).execute()
    return res.data or []


# ── ADMIN: GET ALL REQUESTS ───────────────────────────────────────────────
@router.get("/admin/deposits")
def admin_deposits():
    res = supabase.table("deposit_requests").select("*").order("created_at", desc=True).execute()
    return res.data or []

@router.get("/admin/withdrawals")
def admin_withdrawals():
    res = supabase.table("withdrawal_requests").select("*").order("created_at", desc=True).execute()
    return res.data or []


# ── ADMIN: APPROVE/REJECT DEPOSIT ────────────────────────────────────────
class ActionReq(BaseModel):
    id: int
    action: str   # approve | reject
    note: str = ""

@router.put("/admin/deposit")
def admin_deposit_action(body: ActionReq):
    req = supabase.table("deposit_requests").select("*").eq("id", body.id).single().execute()
    if not req.data:
        raise HTTPException(404, "Request nahi mila")
    r = req.data
    if r["status"] != "pending":
        raise HTTPException(400, "Already processed")

    if body.action == "approve":
        settings = supabase.table("settings").select("value").eq("key", "price").single().execute()
        price = float(settings.data["value"]) if settings.data else 0.01
        fee = r["amount_usd"] * 0.005
        cc = (r["amount_usd"] - fee) / price

        user = supabase.table("users").select("wallet_cc").eq("email", r["email"]).single().execute()
        supabase.table("users").update({
            "wallet_cc": (user.data["wallet_cc"] or 0) + cc
        }).eq("email", r["email"]).execute()

        supabase.table("transactions").insert({
            "email": r["email"], "type": "DEPOSIT",
            "cc": cc, "usd": r["amount_usd"], "fee": fee,
            "method": "Binance", "extra": f"TxID: {r['txid']}"
        }).execute()

        supabase.table("deposit_requests").update({
            "status": "approved", "cc_credited": cc, "note": body.note
        }).eq("id", body.id).execute()

        add_notification(r["email"], "✅ Deposit Approved",
                         f"${r['amount_usd']} deposit approved! {round(cc,2)} IK credited.", "success")
        admin_log("Deposit Approved", f"User: {r['email']} | ${r['amount_usd']} | {round(cc,2)} IK")
    else:
        supabase.table("deposit_requests").update({
            "status": "rejected", "note": body.note
        }).eq("id", body.id).execute()
        add_notification(r["email"], "❌ Deposit Rejected",
                         f"${r['amount_usd']} deposit rejected. Reason: {body.note or 'N/A'}", "error")
        admin_log("Deposit Rejected", f"User: {r['email']} | ${r['amount_usd']}")

    return {"message": f"Deposit {body.action}d"}


# ── ADMIN: APPROVE/REJECT WITHDRAWAL ─────────────────────────────────────
@router.put("/admin/withdrawal")
def admin_withdrawal_action(body: ActionReq):
    req = supabase.table("withdrawal_requests").select("*").eq("id", body.id).single().execute()
    if not req.data:
        raise HTTPException(404, "Request nahi mila")
    r = req.data
    if r["status"] != "pending":
        raise HTTPException(400, "Already processed")

    if body.action == "approve":
        supabase.table("transactions").insert({
            "email": r["email"], "type": "SELL",
            "cc": r["amount_cc"], "usd": r["amount_usd"], "fee": r["amount_usd"] * 0.005,
            "method": "Binance", "extra": f"Binance ID: {r['binance_id']}"
        }).execute()
        supabase.table("withdrawal_requests").update({
            "status": "approved", "note": body.note
        }).eq("id", body.id).execute()
        add_notification(r["email"], "✅ Withdrawal Approved",
                         f"{r['amount_cc']} IK withdrawal approved! ${r['amount_usd']} USDT bheja ja raha hai.", "success")
        admin_log("Withdrawal Approved", f"User: {r['email']} | {r['amount_cc']} IK")
    else:
        # Refund balance
        user = supabase.table("users").select("wallet_cc").eq("email", r["email"]).single().execute()
        supabase.table("users").update({
            "wallet_cc": (user.data["wallet_cc"] or 0) + r["amount_cc"]
        }).eq("email", r["email"]).execute()
        supabase.table("withdrawal_requests").update({
            "status": "rejected", "note": body.note
        }).eq("id", body.id).execute()
        add_notification(r["email"], "❌ Withdrawal Rejected",
                         f"{r['amount_cc']} IK withdrawal rejected. Balance wapas credit ho gaya.", "error")
        admin_log("Withdrawal Rejected", f"User: {r['email']} | {r['amount_cc']} IK refunded")

    return {"message": f"Withdrawal {body.action}d"}
