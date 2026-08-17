import asyncpg

from .config import settings

pool: asyncpg.Pool | None = None

SCHEMA = """
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC(12, 2) NOT NULL CHECK (price > 0),
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  inventory INTEGER NOT NULL DEFAULT 0 CHECK (inventory >= 0),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"""

SEED = """
INSERT INTO products (slug, name, description, category, price, inventory)
VALUES
 ('arc-one-headphones', 'Arc One Headphones', 'Immersive wireless sound with all-day comfort.', 'Audio', 249.00, 42),
 ('form-mechanical-keyboard', 'Form Mechanical Keyboard', 'A precise, quiet keyboard made for deep work.', 'Workspace', 189.00, 28),
 ('halo-desk-light', 'Halo Desk Light', 'Adaptive, glare-free light for focused spaces.', 'Workspace', 129.00, 64),
 ('frame-mini-speaker', 'Frame Mini Speaker', 'Room-filling sound in a compact aluminum body.', 'Audio', 159.00, 19),
 ('orbit-smartwatch', 'Orbit Smartwatch', 'Essential health and timekeeping, without distraction.', 'Wearables', 299.00, 35),
 ('fold-travel-charger', 'Fold Travel Charger', 'A compact three-device charger for life in motion.', 'Travel', 79.00, 91)
ON CONFLICT (slug) DO NOTHING;
"""


async def connect() -> None:
    global pool
    pool = await asyncpg.create_pool(settings.database_url, min_size=1, max_size=5)
    async with pool.acquire() as connection:
        await connection.execute(SCHEMA)
        await connection.execute(SEED)


async def disconnect() -> None:
    global pool
    if pool:
        await pool.close()
        pool = None


def get_pool() -> asyncpg.Pool:
    if pool is None:
        raise RuntimeError("Database pool is not initialized")
    return pool
