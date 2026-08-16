import json
import os
from contextlib import asynccontextmanager
from decimal import Decimal

import redis.asyncio as redis
from fastapi import FastAPI, HTTPException
from prometheus_fastapi_instrumentator import Instrumentator
from pydantic import BaseModel, Field

cache: redis.Redis | None = None
BASE_PRICES = {
    "arc-one-headphones": Decimal("249.00"),
    "form-mechanical-keyboard": Decimal("189.00"),
    "halo-desk-light": Decimal("129.00"),
    "frame-mini-speaker": Decimal("159.00"),
    "orbit-smartwatch": Decimal("299.00"),
    "fold-travel-charger": Decimal("79.00"),
}


class PriceRequest(BaseModel):
    slug: str
    quantity: int = Field(ge=1, le=25)
    coupon: str | None = None


@asynccontextmanager
async def lifespan(_: FastAPI):
    global cache
    cache = redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379"), decode_responses=True)
    yield
    await cache.aclose()


app = FastAPI(title="Meridian Pricing API", version="1.0.0", lifespan=lifespan)
Instrumentator().instrument(app).expose(app)


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "pricing-service"}


@app.post("/quote")
async def quote(request: PriceRequest):
    key = f"quote:{request.slug}:{request.quantity}:{request.coupon or '-'}"
    if cache and (cached := await cache.get(key)):
        return {**json.loads(cached), "cached": True}
    price = BASE_PRICES.get(request.slug)
    if price is None:
        raise HTTPException(404, "Price not found")
    subtotal = price * request.quantity
    discount = subtotal * Decimal("0.10") if request.coupon == "MERIDIAN10" else Decimal("0")
    result = {
        "slug": request.slug,
        "unitPrice": float(price),
        "quantity": request.quantity,
        "subtotal": float(subtotal),
        "discount": float(discount),
        "total": float(subtotal - discount),
        "currency": "USD",
        "cached": False,
    }
    if cache:
        await cache.setex(key, 60, json.dumps(result))
    return result
