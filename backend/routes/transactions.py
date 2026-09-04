from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from db import supabase

router = APIRouter()

REF_BUY_PCT_DEFAULT = 10.0


def get_ref_pct():
    res = supabase.table("settings").select("value").eq("key", "refSellPct").single().execute()
    return float(res.data["value"]) if res.data else REF_BUY_PCT_DEFAULT


# ── SAVE TRANSACTION ──────────────────────────────────────────────────────
class TxRequest(BaseModel):
    email: EmailStr
    type: str          # BUY | SELL | DEPOSIT | SHARE
    cc: float
    usd: float
    fee: float
    method: str = "Binance"
    extra: str = ""

@router.post("/")
def save_tx(body: TxRequest):
    supabase.table("transactions").insert({
        "email": body.email,
        "type": body.type,
        "cc": body.cc,
        "usd": body.usd,
        "fee": body.fee,
        "method": body.method,
        "extra": body.extra,
    }).execute()

    # Referral commission on BUY or SELL
    if body.type in ("BUY", "SELL"):
        _apply_referral_commission(body.email, body.cc, body.type)

    return {"message": "Transaction saved"}


def _apply_referral_commission(buyer_email: str, cc: float, tx_type: str):
    user = supabase.table("users").select("referred_by").eq("email", buyer_email).single().execute()
    if not user.data or not user.data.get("referred_by"):
        return

    referrer_email = user.data["referred_by"]
    pct = get_ref_pct()
    bonus = cc * (pct / 100)

    referrer = supabase.table("users").select("wallet_cc,ref_earned").eq("email", referrer_email).single().execute()
    if not referrer.data:
        return

    new_cc     = (referrer.data["wallet_cc"] or 0) + bonus
    new_earned = (referrer.data["ref_earned"] or 0) + bonus
    supabase.table("users").update({"wallet_cc": new_cc, "ref_earned": new_earned}).eq("email", referrer_email).execute()

    # Update referral record
    supabase.table("referrals").update({
        "has_bought": True,
        "total_earned": supabase.rpc("increment_earned", {"ref_email": buyer_email, "ref_referrer": referrer_email, "amount": bonus})
    }).eq("referrer_email", referrer_email).eq("referred_email", buyer_email).execute()


# ── GET USER TRANSACTIONS ─────────────────────────────────────────────────
@router.get("/{email}")
def get_user_txs(email: str, limit: int = 50):
    res = supabase.table("transactions").select("*").eq("email", email).order("created_at", desc=True).limit(limit).execute()
    return res.data or []


# ── GET ALL TRANSACTIONS (admin) ──────────────────────────────────────────
@router.get("/")
def get_all_txs(limit: int = 200):
    res = supabase.table("transactions").select("*").order("created_at", desc=True).limit(limit).execute()
    return res.data or []


# ── SHARE COINS ───────────────────────────────────────────────────────────
class ShareRequest(BaseModel):
    from_email: EmailStr
    to_email: EmailStr
    amount: float

@router.post("/share")
def share_coins(body: ShareRequest):
    fee = body.amount * 0.001
    sends = body.amount - fee

    sender = supabase.table("users").select("wallet_cc").eq("email", body.from_email).single().execute()
    if not sender.data:
        raise HTTPException(404, "Sender nahi mila.")
    if (sender.data["wallet_cc"] or 0) < body.amount:
        raise HTTPException(400, "Insufficient balance.")

    # Deduct from sender
    supabase.table("users").update({"wallet_cc": sender.data["wallet_cc"] - body.amount}).eq("email", body.from_email).execute()

    # Credit to receiver if exists
    receiver = supabase.table("users").select("wallet_cc").eq("email", body.to_email).single().execute()
    if receiver.data:
        supabase.table("users").update({"wallet_cc": (receiver.data["wallet_cc"] or 0) + sends}).eq("email", body.to_email).execute()

    # Save tx
    supabase.table("transactions").insert({
        "email": body.from_email, "type": "SHARE",
        "cc": body.amount, "usd": 0, "fee": fee,
        "method": "Internal", "extra": f"{sends} IK → {body.to_email}"
    }).execute()

    return {"message": f"{sends:.4f} IK sent to {body.to_email}"}
