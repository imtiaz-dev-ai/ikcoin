from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from db import supabase

router = APIRouter()


# ── GET USER ──────────────────────────────────────────────────────────────
@router.get("/{email}")
def get_user(email: str):
    res = supabase.table("users").select("*").eq("email", email).single().execute()
    if not res.data:
        raise HTTPException(404, "User nahi mila.")
    return res.data


# ── UPDATE WALLET ─────────────────────────────────────────────────────────
class WalletUpdate(BaseModel):
    email: EmailStr
    wallet_cc: float

@router.put("/wallet")
def update_wallet(body: WalletUpdate):
    supabase.table("users").update({"wallet_cc": body.wallet_cc}).eq("email", body.email).execute()
    return {"message": "Wallet updated"}


# ── UPDATE AVATAR ─────────────────────────────────────────────────────────
class AvatarUpdate(BaseModel):
    email: EmailStr
    avatar_url: str

@router.put("/avatar")
def update_avatar(body: AvatarUpdate):
    supabase.table("users").update({"avatar_url": body.avatar_url}).eq("email", body.email).execute()
    return {"message": "Avatar updated"}


# ── GET REFERRALS ─────────────────────────────────────────────────────────
@router.get("/{email}/referrals")
def get_referrals(email: str):
    res = supabase.table("referrals").select("*").eq("referrer_email", email).execute()
    return res.data or []


# ── CLAIM SURPRISE ────────────────────────────────────────────────────────
class ClaimRequest(BaseModel):
    email: EmailStr

@router.post("/claim-surprise")
def claim_surprise(body: ClaimRequest):
    user = supabase.table("users").select("name,phone,surprise_claimed").eq("email", body.email).single().execute()
    if not user.data:
        raise HTTPException(404, "User nahi mila.")
    if user.data.get("surprise_claimed"):
        raise HTTPException(400, "Already claimed.")

    supabase.table("users").update({"surprise_claimed": True}).eq("email", body.email).execute()
    supabase.table("surprise_claims").insert({
        "email": body.email,
        "name": user.data["name"],
        "phone": user.data.get("phone", "")
    }).execute()
    return {"message": "Claim ho gaya! Team 24h mein contact karegi."}
