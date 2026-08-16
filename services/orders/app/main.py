import asyncio
import json
import os
from contextlib import asynccontextmanager
from decimal import Decimal
from uuid import UUID, uuid4

import asyncpg
import httpx
from aiokafka import AIOKafkaConsumer, AIOKafkaProducer
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from prometheus_fastapi_instrumentator import Instrumentator
from pydantic import BaseModel, Field

pool: asyncpg.Pool | None = None
producer: AIOKafkaProducer | None = None
consumer_task: asyncio.Task | None = None
connections: dict[str, set[WebSocket]] = {}


class OrderItem(BaseModel):
    productId: UUID
    slug: str
    quantity: int = Field(ge=1, le=25)


class Checkout(BaseModel):
    userId: str
    items: list[OrderItem] = Field(min_length=1)
    coupon: str | None = None
    paymentToken: str = "tok_mock_success"


async def broadcast(order_id: str, event: dict):
    for socket in list(connections.get(order_id, set())):
        try:
            await socket.send_json(event)
        except Exception:
            connections[order_id].discard(socket)


async def consume_events():
    consumer = AIOKafkaConsumer(
        "order.events",
        "inventory.events",
        bootstrap_servers=os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092"),
        group_id="order-websocket",
        auto_offset_reset="latest",
    )
    await consumer.start()
    try:
        async for message in consumer:
            event = json.loads(message.value)
            if order_id := event.get("orderId"):
                await broadcast(order_id, event)
    finally:
        await consumer.stop()


@asynccontextmanager
async def lifespan(_: FastAPI):
    global pool, producer, consumer_task
    pool = await asyncpg.create_pool(
        os.getenv("DATABASE_URL", "postgresql://meridian:meridian@localhost:5432/meridian")
    )
    async with pool.acquire() as connection:
        await connection.execute(
            """CREATE TABLE IF NOT EXISTS orders (id UUID PRIMARY KEY, user_id TEXT NOT NULL, status TEXT NOT NULL, total NUMERIC(12,2) NOT NULL, currency CHAR(3) NOT NULL DEFAULT 'USD', items JSONB NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())"""
        )
    producer = AIOKafkaProducer(
        bootstrap_servers=os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
    )
    await producer.start()
    consumer_task = asyncio.create_task(consume_events())
    yield
    consumer_task.cancel()
    await producer.stop()
    await pool.close()


app = FastAPI(title="Meridian Orders API", version="1.0.0", lifespan=lifespan)
Instrumentator().instrument(app).expose(app)


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "order-service"}


async def emit(event: dict):
    await producer.send_and_wait("order.events", json.dumps(event).encode())
    await broadcast(event["orderId"], event)


@app.post("/checkout", status_code=201)
async def checkout(payload: Checkout):
    order_id = uuid4()
    total = Decimal("0")
    async with httpx.AsyncClient(timeout=10) as client:
        for item in payload.items:
            quote = await client.post(
                f"{os.getenv('PRICING_URL', 'http://localhost:8001')}/quote",
                json={"slug": item.slug, "quantity": item.quantity, "coupon": payload.coupon},
            )
            quote.raise_for_status()
            total += Decimal(str(quote.json()["total"]))
        payment = await client.post(
            f"{os.getenv('PAYMENT_URL', 'http://localhost:8004')}/payments",
            json={"orderId": str(order_id), "amount": float(total), "token": payload.paymentToken},
        )
        if payment.status_code != 200:
            raise HTTPException(402, "Payment declined")
        for item in payload.items:
            reservation = await client.post(
                f"{os.getenv('INVENTORY_URL', 'http://localhost:8002')}/reservations",
                json={
                    "orderId": str(order_id),
                    "productId": str(item.productId),
                    "quantity": item.quantity,
                },
            )
            if reservation.status_code != 200:
                raise HTTPException(
                    409, reservation.json().get("detail", "Inventory reservation failed")
                )
    items_json = json.dumps([item.model_dump(mode="json") for item in payload.items])
    await pool.execute(
        "INSERT INTO orders(id,user_id,status,total,items) VALUES($1,$2,'CONFIRMED',$3,$4::jsonb)",
        order_id,
        payload.userId,
        total,
        items_json,
    )
    event = {
        "type": "order.confirmed",
        "orderId": str(order_id),
        "status": "CONFIRMED",
        "total": float(total),
    }
    await emit(event)
    return event


@app.get("/orders/{order_id}")
async def get_order(order_id: UUID):
    row = await pool.fetchrow(
        "SELECT id,user_id,status,total,currency,items,created_at FROM orders WHERE id=$1", order_id
    )
    if not row:
        raise HTTPException(404, "Order not found")
    return {
        **dict(row),
        "id": str(row["id"]),
        "total": float(row["total"]),
        "created_at": row["created_at"].isoformat(),
    }


@app.get("/orders")
async def list_orders():
    rows = await pool.fetch(
        "SELECT id,user_id,status,total,currency,created_at FROM orders ORDER BY created_at DESC LIMIT 100"
    )
    return [
        {
            **dict(r),
            "id": str(r["id"]),
            "total": float(r["total"]),
            "created_at": r["created_at"].isoformat(),
        }
        for r in rows
    ]


@app.websocket("/ws/orders/{order_id}")
async def order_updates(socket: WebSocket, order_id: str):
    await socket.accept()
    connections.setdefault(order_id, set()).add(socket)
    await socket.send_json({"type": "connected", "orderId": order_id})
    try:
        while True:
            await socket.receive_text()
    except WebSocketDisconnect:
        connections[order_id].discard(socket)
