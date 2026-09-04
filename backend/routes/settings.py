from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from db import supabase

router = APIRouter()

DEFAULTS = {
    "price": "0.01",
    "supply": "500000000",
    "holders": "12450",
    "network": "BNB Smart Chain",
    "fee": "0.5",
    "refSellPct": "10",
    "binanceId": "123456789",
}


# ── GET ALL SETTINGS ──────────────────────────────────────────────────────
@router.get("/")
def get_settings():
    res = supabase.table("settings").select("key,value").execute()
    data = {row["key"]: row["value"] for row in (res.data or [])}
    return {**DEFAULTS, **data}


# ── UPDATE SETTING ────────────────────────────────────────────────────────
class SettingUpdate(BaseModel):
    key: str
    value: str

@router.put("/")
def update_setting(body: SettingUpdate):
    supabase.table("settings").upsert({"key": body.key, "value": body.value}).execute()
    return {"message": f"{body.key} updated"}


# ── UPDATE MULTIPLE SETTINGS ──────────────────────────────────────────────
class BulkSettings(BaseModel):
    price: Optional[str] = None
    supply: Optional[str] = None
    holders: Optional[str] = None
    network: Optional[str] = None
    fee: Optional[str] = None
    refSellPct: Optional[str] = None
    binanceId: Optional[str] = None

@router.put("/bulk")
def bulk_update(body: BulkSettings):
    rows = [{"key": k, "value": v} for k, v in body.dict().items() if v is not None]
    if rows:
        supabase.table("settings").upsert(rows).execute()
    return {"message": "Settings saved"}
