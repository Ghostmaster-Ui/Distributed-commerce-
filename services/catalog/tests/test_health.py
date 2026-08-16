import pytest

from app.main import health


@pytest.mark.asyncio
async def test_health_endpoint() -> None:
    response = await health()
    assert response["status"] == "healthy"
    assert response["service"] == "catalog-service"
