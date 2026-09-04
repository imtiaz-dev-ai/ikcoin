import random, string, os
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from db import supabase

router = APIRouter()

OTP_EXPIRE = int(os.getenv("OTP_EXPIRE_MINUTES", 10))

def gen_otp():
    return str(random.randint(100000, 999999))

def gen_ref_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))

def gen_wallet_addr():
    return 'IK' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=12))


# ── SEND OTP ──────────────────────────────────────────────────────────────
class OTPRequest(BaseModel):
    email: EmailStr

@router.post("/send-otp")
def send_otp(body: OTPRequest):
    # Check user exists
    res = supabase.table("users").select("email,name").eq("email", body.email).single().execute()
    if not res.data:
        raise HTTPException(404, "Email registered nahi hai. Pehle register karo.")

    code = gen_otp()
    expires = (datetime.utcnow() + timedelta(minutes=OTP_EXPIRE)).isoformat()

    # Upsert OTP
    supabase.table("otps").upsert({
        "email": body.email,
        "code": code,
        "expires_at": expires
    }).execute()

    # NOTE: Yahan EmailJS ya SMTP se email bhejo
    # Abhi OTP response mein return kar rahe hain (dev mode)
    print(f"🔐 OTP for {body.email}: {code}")
    return {"message": "OTP sent", "dev_otp": code}  # production mein dev_otp hata dena


# ── REGISTER ──────────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    phone: str
    ref_code: str = None

@router.post("/register")
def register(body: RegisterRequest):
    # Check duplicate
    existing = supabase.table("users").select("email").eq("email", body.email).execute()
    if existing.data:
        raise HTTPException(400, "Email already registered. Login karo.")

    ref_code = gen_ref_code()
    wallet_addr = gen_wallet_addr()
    self_bonus = 0.0
    referred_by = None

    # Referral check
    if body.ref_code:
        ref_user = supabase.table("users").select("email,wallet_cc,ref_earned").eq("referral_code", body.ref_code.upper()).single().execute()
        if ref_user.data:
            referred_by = ref_user.data["email"]
            self_bonus = 25.0  # REF_SELF_BONUS
            # Referrer ko join bonus
            new_cc = (ref_user.data["wallet_cc"] or 0) + 50  # REF_JOIN_BONUS
            new_earned = (ref_user.data["ref_earned"] or 0) + 50
            supabase.table("users").update({
                "wallet_cc": new_cc,
                "ref_earned": new_earned
            }).eq("email", referred_by).execute()
            # Referral record
            supabase.table("referrals").insert({
                "referrer_email": referred_by,
                "referred_email": body.email,
                "join_bonus": 50.0
            }).execute()

    supabase.table("users").insert({
        "name": body.name,
        "email": body.email,
        "phone": body.phone,
        "wallet_cc": self_bonus,
        "wallet_addr": wallet_addr,
        "referral_code": ref_code,
        "ref_earned": 0.0,
        "referred_by": referred_by,
    }).execute()

    # OTP bhejo
    code = gen_otp()
    expires = (datetime.utcnow() + timedelta(minutes=OTP_EXPIRE)).isoformat()
    supabase.table("otps").upsert({"email": body.email, "code": code, "expires_at": expires}).execute()
    print(f"🔐 OTP for {body.email}: {code}")

    return {"message": "Registered! OTP sent.", "dev_otp": code}


# ── VERIFY OTP ────────────────────────────────────────────────────────────
class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str

@router.post("/verify-otp")
def verify_otp(body: VerifyOTPRequest):
    res = supabase.table("otps").select("*").eq("email", body.email).single().execute()
    if not res.data:
        raise HTTPException(400, "OTP nahi mila. Dobara bhejo.")

    otp_data = res.data
    if otp_data["code"] != body.otp:
        raise HTTPException(400, "Wrong OTP.")

    if datetime.utcnow() > datetime.fromisoformat(otp_data["expires_at"]):
        raise HTTPException(400, "OTP expire ho gaya. Dobara bhejo.")

    # Delete used OTP
    supabase.table("otps").delete().eq("email", body.email).execute()

    # Return user data
    user = supabase.table("users").select("*").eq("email", body.email).single().execute()
    return {"message": "Login successful", "user": user.data}


# ── CHECK REF CODE ────────────────────────────────────────────────────────
@router.get("/check-ref/{code}")
def check_ref(code: str):
    res = supabase.table("users").select("name,referral_code").eq("referral_code", code.upper()).single().execute()
    if res.data:
        return {"valid": True, "name": res.data["name"]}
    return {"valid": False}
