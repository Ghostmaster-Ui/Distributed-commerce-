from contextlib import asynccontextmanager
from uuid import UUID

from fastapi import FastAPI, HTTPException, Query, status
from prometheus_fastapi_instrumentator import Instrumentator

from . import database
from .config import settings
from .models import Product, ProductCreate, StockAdjustment


@asynccontextmanager
async def lifespan(_: FastAPI):
    await database.connect()
    yield
    await database.disconnect()


app = FastAPI(title="Meridian Catalog API", version="0.1.0", lifespan=lifespan)
Instrumentator().instrument(app).expose(app)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "healthy", "service": settings.service_name}


@app.get("/products", response_model=list[Product])
async def list_products(
    category: str | None = None,
    search: str | None = Query(default=None, max_length=100),
) -> list[Product]:
    clauses = ["active = TRUE"]
    values: list[str] = []
    if category:
        values.append(category)
        clauses.append(f"category = ${len(values)}")
    if search:
        values.append(f"%{search}%")
        clauses.append(f"(name ILIKE ${len(values)} OR description ILIKE ${len(values)})")
    query = f"SELECT id, slug, name, description, category, price, currency, inventory, active FROM products WHERE {' AND '.join(clauses)} ORDER BY name"
    rows = await database.get_pool().fetch(query, *values)
    return [Product(**dict(row)) for row in rows]


@app.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: UUID) -> Product:
    row = await database.get_pool().fetchrow(
        "SELECT id, slug, name, description, category, price, currency, inventory, active FROM products WHERE id = $1 AND active = TRUE",
        product_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Product not found")
    return Product(**dict(row))


@app.post("/products/{product_id}/restock", response_model=Product)
async def restock_product(product_id: UUID, adjustment: StockAdjustment) -> Product:
    row = await database.get_pool().fetchrow(
        """UPDATE products SET inventory = inventory + $1, updated_at = NOW()
           WHERE id = $2
           RETURNING id, slug, name, description, category, price, currency, inventory, active""",
        adjustment.quantity,
        product_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Product not found")
    return Product(**dict(row))


@app.post("/products", response_model=Product, status_code=status.HTTP_201_CREATED)
async def create_product(product: ProductCreate) -> Product:
    try:
        row = await database.get_pool().fetchrow(
            """INSERT INTO products (slug, name, description, category, price, currency, inventory)
               VALUES ($1, $2, $3, $4, $5, $6, $7)
               RETURNING id, slug, name, description, category, price, currency, inventory, active""",
            product.slug,
            product.name,
            product.description,
            product.category,
            product.price,
            product.currency.upper(),
            product.inventory,
        )
    except Exception as error:
        if "unique" in str(error).lower():
            raise HTTPException(status_code=409, detail="Product slug already exists") from error
        raise
    return Product(**dict(row))
