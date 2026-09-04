from fastapi import APIRouter
from pydantic import BaseModel, EmailStr
from db import supabase

router = APIRouter()


# ── GET NOTIFICATIONS ─────────────────────────────────────────────────────
@router.get("/{email}")
def get_notifications(email: str):
    res = supabase.table("notifications").select("*").eq("email", email).order("created_at", desc=True).limit(50).execute()
    return res.data or []


# ── UNREAD COUNT ──────────────────────────────────────────────────────────
@router.get("/{email}/unread")
def unread_count(email: str):
    res = supabase.table("notifications").select("id").eq("email", email).eq("is_read", False).execute()
    return {"count": len(res.data or [])}


# ── MARK ALL READ ─────────────────────────────────────────────────────────
class MarkRead(BaseModel):
    email: EmailStr

@router.put("/read-all")
def mark_all_read(body: MarkRead):
    supabase.table("notifications").update({"is_read": True}).eq("email", body.email).execute()
    return {"message": "All marked read"}
