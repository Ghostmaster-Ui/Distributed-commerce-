import json
import os
from contextlib import asynccontextmanager
from uuid import UUID

import asyncpg
from aiokafka import AIOKafkaProducer
from fastapi import FastAPI, HTTPException
from prometheus_fastapi_instrumentator import Instrumentator
from pydantic import BaseModel, Field

pool: asyncpg.Pool | None = None
producer: AIOKafkaProducer | None = None
event_transport = os.getenv("EVENT_TRANSPORT", "kafka").lower()


class Reservation(BaseModel):
    orderId: UUID
    productId: UUID
    quantity: int = Field(ge=1, le=25)


@asynccontextmanager
async def lifespan(_: FastAPI):
    global pool, producer
    pool = await asyncpg.create_pool(
        os.getenv("DATABASE_URL", "postgresql://meridian:meridian@localhost:5432/meridian"),
        min_size=1,
        max_size=int(os.getenv("DATABASE_POOL_SIZE", "5")),
    )
    if event_transport == "kafka":
        producer = AIOKafkaProducer(
            bootstrap_servers=os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
        )
        await producer.start()
    yield
    if producer:
        await producer.stop()
    await pool.close()


app = FastAPI(title="Meridian Inventory API", version="1.0.0", lifespan=lifespan)
Instrumentator().instrument(app).expose(app)


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "inventory-service"}


@app.get("/inventory/{product_id}")
async def get_inventory(product_id: UUID):
    quantity = await pool.fetchval("SELECT inventory FROM products WHERE id=$1", product_id)
    if quantity is None:
        raise HTTPException(404, "Product not found")
    return {"productId": str(product_id), "available": quantity}


@app.post("/reservations")
async def reserve(item: Reservation):
    async with pool.acquire() as connection, connection.transaction():
        row = await connection.fetchrow(
            "SELECT inventory FROM products WHERE id=$1 FOR UPDATE", item.productId
        )
        if not row:
            raise HTTPException(404, "Product not found")
        if row["inventory"] < item.quantity:
            raise HTTPException(409, "Insufficient inventory")
        await connection.execute(
            "UPDATE products SET inventory=inventory-$1, updated_at=NOW() WHERE id=$2",
            item.quantity,
            item.productId,
        )
    event = {
        "type": "inventory.reserved",
        "orderId": str(item.orderId),
        "productId": str(item.productId),
        "quantity": item.quantity,
    }
    if producer:
        await producer.send_and_wait("inventory.events", json.dumps(event).encode())
    return {**event, "status": "reserved"}
