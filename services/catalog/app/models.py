from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class Product(BaseModel):
    id: UUID
    slug: str
    name: str
    description: str
    category: str
    price: Decimal
    currency: str = "USD"
    inventory: int = Field(ge=0)
    active: bool = True


class ProductCreate(BaseModel):
    slug: str = Field(pattern=r"^[a-z0-9-]+$")
    name: str = Field(min_length=2, max_length=120)
    description: str = Field(max_length=1000)
    category: str = Field(min_length=2, max_length=80)
    price: Decimal = Field(gt=0, decimal_places=2)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    inventory: int = Field(default=0, ge=0)


class StockAdjustment(BaseModel):
    quantity: int = Field(gt=0, le=10000)
