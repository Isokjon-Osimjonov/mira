#!/bin/bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMDExMmJjYS0zMzcyLTQ3NGEtOGRkNS00MjY0ZGE0NDZjZjgiLCJ0eXBlIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQG1pcmFjb3NtZXRpY3MudXoiLCJyb2xlSWQiOm51bGwsImlzU3VwZXJBZG1pbiI6dHJ1ZSwiaWF0IjoxNzgwMzc3MjEwLCJleHAiOjE3ODAzNzgxMTB9.FbYuR_N5cFY-BVo8jBno9zseXce3lJzYnW98NkfB7DI"
URL="http://localhost:4000"
TS=$(date +%s)

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "=== STARTING API TESTS (Unique TS: $TS) ==="

test_endpoint() {
  local num=$1
  local name=$2
  local res=$3
  if echo "$res" | grep -q '"error":null'; then
    echo -e "$num. $name: ${GREEN}✅ PASS${NC}"
  else
    echo -e "$num. $name: ${RED}❌ FAIL${NC}"
    echo "$res" | python3 -m json.tool
  fi
}

# 1. Health
RES1=$(curl -s $URL/health)
test_endpoint 1 "Health" "$RES1"

# 2. Public settings
RES2=$(curl -s $URL/api/v1/settings/payment-methods)
test_endpoint 2 "Public settings" "$RES2"

# 3. Exchange rate
RES3=$(curl -s $URL/api/v1/exchange-rates/latest)
test_endpoint 3 "Exchange rate" "$RES3"

# 4. Categories
RES4=$(curl -s $URL/api/v1/categories)
test_endpoint 4 "Categories" "$RES4"

# 5. Products
RES5=$(curl -s "$URL/api/v1/products?page=1&limit=5")
test_endpoint 5 "Products" "$RES5"

# 6. Boxes
RES6=$(curl -s $URL/api/v1/boxes)
test_endpoint 6 "Boxes" "$RES6"

# 7. KOR shipping tiers
RES7=$(curl -s $URL/api/v1/kor-shipping-tiers)
test_endpoint 7 "KOR shipping tiers" "$RES7"

# 9. Admin settings
RES9=$(curl -s $URL/api/v1/admin/settings -H "Authorization: Bearer $TOKEN")
test_endpoint 9 "Admin settings" "$RES9"

# 10. Update settings
RES10=$(curl -s -X PUT $URL/api/v1/admin/settings -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"korBankEnabled":true,"korBankName":"신한은행","korBankHolder":"김미라","korBankNumber":"110-123-456789"}')
test_endpoint 10 "Update settings" "$RES10"

# 11. Verify settings updated
RES11=$(curl -s $URL/api/v1/settings/payment-methods)
test_endpoint 11 "Verify settings updated" "$RES11"

# 12. Create category
CAT_RES=$(curl -s -X POST $URL/api/v1/admin/categories -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d "{\"name\":\"Toner $TS\",\"slug\":\"toner-$TS\",\"sortOrder\":1}")
test_endpoint 12 "Create category" "$CAT_RES"
CAT_ID=$(echo $CAT_RES | python3 -c "import sys,json; print(json.load(sys.stdin).get('data', {}).get('id', ''))")

# 13. Create product
PROD_PAYLOAD=$(cat <<EOF
{
  "barcode": "B$TS",
  "sku": "SKU$TS",
  "name": "Product $TS",
  "brandName": "COSRX",
  "categoryId": "$CAT_ID",
  "weightGrams": 250,
  "imageUrls": [],
  "ingredients": [],
  "skinTypes": ["oily"],
  "benefits": ["pore care"],
  "regionalConfigs": [
    { "regionCode": "UZB", "retailPrice": "180000", "wholesalePrice": "140000", "minWholesaleQty": 5 },
    { "regionCode": "KOR", "retailPrice": "15000", "wholesalePrice": "11000", "minWholesaleQty": 5 }
  ]
}
EOF
)
PROD_RES=$(curl -s -X POST $URL/api/v1/admin/products -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d "$PROD_PAYLOAD")
test_endpoint 13 "Create product" "$PROD_RES"
PROD_ID=$(echo $PROD_RES | python3 -c "import sys,json; print(json.load(sys.stdin).get('data', {}).get('id', ''))")

# 14. Get product detail
RES14=$(curl -s "$URL/api/v1/products/$PROD_ID")
test_endpoint 14 "Get product detail" "$RES14"

# 15. Create inventory batch
BATCH_RES=$(curl -s -X POST $URL/api/v1/admin/inventory/batches -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d "{\"productId\":\"$PROD_ID\",\"initialQty\":100,\"costPrice\":6000,\"batchRef\":\"BATCH-$TS\",\"expiryDate\":\"2027-12-31\"}")
test_endpoint 15 "Create inventory batch" "$BATCH_RES"

# 16. Product now has stock
RES16=$(curl -s "$URL/api/v1/products/$PROD_ID")
test_endpoint 16 "Product now has stock" "$RES16"

# 17. Inventory stock summary
RES17=$(curl -s $URL/api/v1/admin/inventory/stock -H "Authorization: Bearer $TOKEN")
test_endpoint 17 "Inventory stock summary" "$RES17"

# 18. Create coupon
COUP_RES=$(curl -s -X POST $URL/api/v1/admin/coupons -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d "{\"code\":\"MIRA$TS\",\"name\":\"Coupon $TS\",\"type\":\"PERCENTAGE\",\"value\":10,\"scope\":\"ENTIRE_ORDER\",\"minOrderKrw\":50000,\"maxUsesTotal\":100,\"firstOrderOnly\":true}")
test_endpoint 18 "Create coupon" "$COUP_RES"
COUP_ID=$(echo $COUP_RES | python3 -c "import sys,json; print(json.load(sys.stdin).get('data', {}).get('id', ''))")

# 19. Activate coupon
RES19=$(curl -s -X PATCH "$URL/api/v1/admin/coupons/$COUP_ID/status" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"status":"ACTIVE"}')
test_endpoint 19 "Activate coupon" "$RES19"

# 20. Create supplier
SUP_RES=$(curl -s -X POST $URL/api/v1/admin/suppliers -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d "{\"name\":\"Supplier $TS\",\"country\":\"KR\"}")
test_endpoint 20 "Create supplier" "$SUP_RES"
SUP_ID=$(echo $SUP_RES | python3 -c "import sys,json; print(json.load(sys.stdin).get('data', {}).get('id', ''))")

# 21. Create purchase order
PO_PAYLOAD=$(cat <<EOF
{
  "supplierId": "$SUP_ID",
  "orderDate": "2026-06-02",
  "expectedDeliveryDate": "2026-06-15",
  "items": [
    { "productId": "$PROD_ID", "quantityOrdered": 200, "unitCostKrw": 5500 }
  ]
}
EOF
)
RES21=$(curl -s -X POST $URL/api/v1/admin/purchase-orders -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d "$PO_PAYLOAD")
test_endpoint 21 "Create purchase order" "$RES21"

# 22. Dashboard overview
RES22=$(curl -s "$URL/api/v1/admin/dashboard/overview?period=this_month" -H "Authorization: Bearer $TOKEN")
test_endpoint 22 "Dashboard overview" "$RES22"

# 23. Dashboard inventory
RES23=$(curl -s "$URL/api/v1/admin/dashboard/inventory" -H "Authorization: Bearer $TOKEN")
test_endpoint 23 "Dashboard inventory" "$RES23"

# 24. Dashboard products
RES24=$(curl -s "$URL/api/v1/admin/dashboard/products?period=this_month" -H "Authorization: Bearer $TOKEN")
test_endpoint 24 "Dashboard products" "$RES24"

# 25. Expense categories
RES25=$(curl -s $URL/api/v1/admin/expense-categories -H "Authorization: Bearer $TOKEN")
test_endpoint 25 "Expense categories" "$RES25"

# 26. Create expense
EXP_CAT_ID=$(echo $RES25 | python3 -c "import sys,json; print(json.load(sys.stdin)['data'][0]['id'])")
RES26=$(curl -s -X POST $URL/api/v1/admin/expenses -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d "{\"categoryId\":\"$EXP_CAT_ID\",\"amountKrw\":50000,\"description\":\"Expense $TS\",\"expenseDate\":\"2026-06-02\"}")
test_endpoint 26 "Create expense" "$RES26"

# 27. Roles list
RES27=$(curl -s $URL/api/v1/admin/roles -H "Authorization: Bearer $TOKEN")
test_endpoint 27 "Roles list" "$RES27"

# 28. Admin users list
RES28=$(curl -s $URL/api/v1/admin/users -H "Authorization: Bearer $TOKEN")
test_endpoint 28 "Admin users list" "$RES28"

# 29. Request OTP
RES29=$(curl -s -X POST $URL/api/v1/auth/request-otp -H 'Content-Type: application/json' -d "{\"phone\":\"+821000000000\"}")
test_endpoint 29 "Request OTP" "$RES29"

# 30. 401 protection
RES30=$(curl -s http://localhost:4000/api/v1/admin/settings)
if echo "$RES30" | grep -q "UNAUTHORIZED"; then
  echo -e "30. 401 protection: ${GREEN}✅ PASS${NC}"
else
  echo -e "30. 401 protection: ${RED}❌ FAIL${NC}"
  echo "$RES30"
fi

# 31. Rate limit test
echo "TEST 31 — Rate limit test"
for i in 1 2 3 4 5 6; do
  curl -s -X POST $URL/api/v1/auth/request-otp -H 'Content-Type: application/json' -d "{\"phone\":\"+998901234567\"}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Request $i: {d.get(\"error\",{}).get(\"code\",\"OK\")}')"
done

# 32. Admin refresh token
RES32=$(curl -s -X POST $URL/api/v1/admin/auth/refresh -b /tmp/mira.txt)
test_endpoint 32 "Admin refresh token" "$RES32"

# 33. Admin logout
RES33=$(curl -s -X POST $URL/api/v1/admin/auth/logout -H "Authorization: Bearer $TOKEN" -b /tmp/mira.txt)
test_endpoint 33 "Admin logout" "$RES33"

# 34. Token valid until expiry
RES34=$(curl -s $URL/api/v1/admin/settings -H "Authorization: Bearer $TOKEN")
test_endpoint 34 "Token valid until expiry" "$RES34"
