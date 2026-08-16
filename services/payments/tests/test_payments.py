import pytest
from fastapi import HTTPException

from app.main import Payment, pay


@pytest.mark.asyncio
async def test_mock_payment_success():
    response = await pay(Payment(orderId="order-1", amount=10, token="tok_mock_success"))
    assert response["status"] == "AUTHORIZED"


@pytest.mark.asyncio
async def test_mock_payment_decline():
    with pytest.raises(HTTPException) as error:
        await pay(Payment(orderId="order-1", amount=10, token="decline"))
    assert error.value.status_code == 402
