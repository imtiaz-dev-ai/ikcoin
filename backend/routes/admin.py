from fastapi import APIRouter
from pydantic import BaseModel
from db import supabase

router = APIRouter()


def admin_log(action: str, detail: str = ""):
    supabase.table("admin_logs").insert({"action": action, "detail": detail}).execute()


# ── DASHBOARD STATS ───────────────────────────────────────────────────────
@router.get("/stats")
def get_stats():
    txs   = supabase.table("transactions").select("type,usd,fee").execute().data or []
    users = supabase.table("users").select("id").execute().data or []
    pend_dep = supabase.table("deposit_requests").select("id").eq("status","pending").execute().data or []
    pend_wit = supabase.table("withdrawal_requests").select("id").eq("status","pending").execute().data or []
    open_tix = supabase.table("support_tickets").select("id").neq("status","closed").execute().data or []

    buy_vol  = sum(float(t["usd"] or 0) for t in txs if t["type"] in ("BUY","DEPOSIT"))
    sell_vol = sum(float(t["usd"] or 0) for t in txs if t["type"] == "SELL")
    fees     = sum(float(t["fee"] or 0) for t in txs)
    return {
        "buy_volume":       round(buy_vol, 2),
        "sell_volume":      round(sell_vol, 2),
        "tx_count":         len(txs),
        "fees_collected":   round(fees, 2),
        "total_users":      len(users),
        "pending_deposits": len(pend_dep),
        "pending_withdrawals": len(pend_wit),
        "open_tickets":     len(open_tix),
    }


# ── ALL USERS ─────────────────────────────────────────────────────────────
@router.get("/users")
def get_all_users():
    res = supabase.table("users").select("*").order("created_at", desc=True).execute()
    return res.data or []


# ── UPDATE USER STATUS ────────────────────────────────────────────────────
class StatusUpdate(BaseModel):
    email: str
    status: str  # active | suspended | banned

@router.put("/users/status")
def update_user_status(body: StatusUpdate):
    supabase.table("users").update({"status": body.status}).eq("email", body.email).execute()
    admin_log(f"User {body.status.capitalize()}", f"User: {body.email}")
    # Notify user
    msgs = {
        "suspended": ("⚠️ Account Suspended", "Aapka account suspend kar diya gaya hai. Support se contact karo."),
        "banned":    ("🚫 Account Banned",     "Aapka account ban ho gaya hai."),
        "active":    ("✅ Account Restored",   "Aapka account dobara active ho gaya hai."),
    }
    if body.status in msgs:
        supabase.table("notifications").insert({
            "email": body.email,
            "title": msgs[body.status][0],
            "body":  msgs[body.status][1],
            "type":  "error" if body.status in ("suspended","banned") else "success"
        }).execute()
    return {"message": f"User {body.status}"}


# ── SURPRISE CLAIMS ───────────────────────────────────────────────────────
@router.get("/claims")
def get_claims():
    res = supabase.table("surprise_claims").select("*").order("created_at", desc=True).execute()
    return res.data or []


# ── ACTIVITY LOGS ─────────────────────────────────────────────────────────
@router.get("/logs")
def get_logs(limit: int = 100):
    res = supabase.table("admin_logs").select("*").order("created_at", desc=True).limit(limit).execute()
    return res.data or []


# ── CLEAR TRANSACTIONS ────────────────────────────────────────────────────
@router.delete("/transactions")
def clear_transactions():
    supabase.table("transactions").delete().neq("id", 0).execute()
    admin_log("Transactions Cleared", "All transactions deleted")
    return {"message": "All transactions cleared"}
