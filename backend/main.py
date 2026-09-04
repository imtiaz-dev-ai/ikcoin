from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import auth, users, transactions, settings, admin, payments, support, notifications

app = FastAPI(title="IK Coin Backend", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,          prefix="/auth",          tags=["Auth"])
app.include_router(users.router,         prefix="/users",         tags=["Users"])
app.include_router(transactions.router,  prefix="/transactions",  tags=["Transactions"])
app.include_router(settings.router,      prefix="/settings",      tags=["Settings"])
app.include_router(admin.router,         prefix="/admin",         tags=["Admin"])
app.include_router(payments.router,      prefix="/payments",      tags=["Payments"])
app.include_router(support.router,       prefix="/support",       tags=["Support"])
app.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])

@app.get("/")
def root():
    return {"status": "IK Coin Backend v2.0 Running ✅"}
