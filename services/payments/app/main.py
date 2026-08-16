from uuid import uuid4

from fastapi import FastAPI, HTTPException
from prometheus_fastapi_instrumentator import Instrumentator
from pydantic import BaseModel, Field

app = FastAPI(title="Meridian Mock Payments", version="1.0.0")
Instrumentator().instrument(app).expose(app)


class Payment(BaseModel):
    orderId: str
    amount: float = Field(gt=0)
    token: str


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "mock-payment-service"}


@app.post("/payments")
async def pay(payment: Payment):
    if payment.token != "tok_mock_success":
        raise HTTPException(402, "Mock payment declined")
    return {
        "paymentId": str(uuid4()),
        "orderId": payment.orderId,
        "status": "AUTHORIZED",
        "amount": payment.amount,
        "provider": "meridian-mock",
    }
