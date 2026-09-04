from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from db import supabase

router = APIRouter()


# ── CREATE TICKET ─────────────────────────────────────────────────────────
class TicketCreate(BaseModel):
    email: EmailStr
    subject: str
    message: str

@router.post("/")
def create_ticket(body: TicketCreate):
    res = supabase.table("support_tickets").insert({
        "email": body.email,
        "subject": body.subject,
        "message": body.message,
    }).execute()
    ticket_id = res.data[0]["id"]
    # First message as reply
    supabase.table("ticket_replies").insert({
        "ticket_id": ticket_id,
        "sender": "user",
        "message": body.message,
    }).execute()
    # Notification
    supabase.table("notifications").insert({
        "email": body.email,
        "title": "🎫 Support Ticket Created",
        "body": f"Ticket #{ticket_id} submit ho gaya. Admin jald reply karega.",
        "type": "info"
    }).execute()
    return {"message": "Ticket created", "ticket_id": ticket_id}


# ── GET USER TICKETS ──────────────────────────────────────────────────────
@router.get("/{email}")
def get_user_tickets(email: str):
    res = supabase.table("support_tickets").select("*").eq("email", email).order("created_at", desc=True).execute()
    return res.data or []


# ── GET TICKET REPLIES ────────────────────────────────────────────────────
@router.get("/{ticket_id}/replies")
def get_replies(ticket_id: int):
    res = supabase.table("ticket_replies").select("*").eq("ticket_id", ticket_id).order("created_at").execute()
    return res.data or []


# ── REPLY TO TICKET ───────────────────────────────────────────────────────
class ReplyCreate(BaseModel):
    ticket_id: int
    sender: str   # 'user' | 'admin'
    message: str

@router.post("/reply")
def reply_ticket(body: ReplyCreate):
    ticket = supabase.table("support_tickets").select("*").eq("id", body.ticket_id).single().execute()
    if not ticket.data:
        raise HTTPException(404, "Ticket nahi mila")
    if ticket.data["status"] == "closed":
        raise HTTPException(400, "Ticket closed hai")

    supabase.table("ticket_replies").insert({
        "ticket_id": body.ticket_id,
        "sender": body.sender,
        "message": body.message,
    }).execute()

    # Update ticket status
    new_status = "replied" if body.sender == "admin" else "open"
    supabase.table("support_tickets").update({"status": new_status}).eq("id", body.ticket_id).execute()

    # Notify user if admin replied
    if body.sender == "admin":
        supabase.table("notifications").insert({
            "email": ticket.data["email"],
            "title": "💬 Support Reply",
            "body": f"Ticket #{body.ticket_id} pe admin ne reply kiya hai.",
            "type": "info"
        }).execute()
        supabase.table("admin_logs").insert({
            "action": "Ticket Replied",
            "detail": f"Ticket #{body.ticket_id} | User: {ticket.data['email']}"
        }).execute()

    return {"message": "Reply sent"}


# ── CLOSE TICKET ──────────────────────────────────────────────────────────
class CloseTicket(BaseModel):
    ticket_id: int

@router.put("/close")
def close_ticket(body: CloseTicket):
    ticket = supabase.table("support_tickets").select("email").eq("id", body.ticket_id).single().execute()
    if not ticket.data:
        raise HTTPException(404, "Ticket nahi mila")
    supabase.table("support_tickets").update({"status": "closed"}).eq("id", body.ticket_id).execute()
    supabase.table("notifications").insert({
        "email": ticket.data["email"],
        "title": "✅ Ticket Closed",
        "body": f"Ticket #{body.ticket_id} close ho gaya.",
        "type": "success"
    }).execute()
    supabase.table("admin_logs").insert({
        "action": "Ticket Closed",
        "detail": f"Ticket #{body.ticket_id}"
    }).execute()
    return {"message": "Ticket closed"}


# ── ADMIN: ALL TICKETS ────────────────────────────────────────────────────
@router.get("/")
def get_all_tickets():
    res = supabase.table("support_tickets").select("*").order("created_at", desc=True).execute()
    return res.data or []
