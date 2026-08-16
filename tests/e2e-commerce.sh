#!/usr/bin/env bash
set -euo pipefail

health=$(curl -fsS http://localhost:8000/health)
[[ "$health" == *'"healthy"'* ]]

login=$(curl -fsS http://localhost:4000/ -H 'content-type: application/json' --data-binary '{"query":"mutation { login(email: \"customer@meridian.local\", password: \"meridian123\") { token } }"}')
token=$(printf '%s' "$login" | sed -E 's/.*"token":"([^"]+)".*/\1/')

products=$(curl -fsS http://localhost:4000/ -H 'content-type: application/json' --data-binary '{"query":"{ products { id slug name price inventory } }"}')
product_id=$(printf '%s' "$products" | sed -E 's/.*"id":"([^"]+)".*/\1/')

curl -fsS http://localhost:4000/ -H 'content-type: application/json' -H "authorization: Bearer $token" --data-binary "{\"query\":\"mutation { addToCart(productId: \\\"$product_id\\\") { itemCount subtotal } }\"}" | grep -q '"itemCount":1'
curl -fsS http://localhost:4000/ -H 'content-type: application/json' -H "authorization: Bearer $token" --data-binary '{"query":"mutation { checkout { orderId status total } }"}' | grep -q '"CONFIRMED"'

echo "End-to-end checkout passed"
