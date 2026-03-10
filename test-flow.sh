#!/bin/bash
set -e

EMAIL="test$(date +%s)@example.com"
PASSWORD="P@a#s@s#w@ord@#$%123@!"
DB_NAME="sso-idp"
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT="5432"
DB_PASS="Liqu1d35!"

export PGPASSWORD="$DB_PASS"

echo "==== START SSO FLOW TEST ===="

# 1️⃣ Register user
echo "→ Register user"
REGISTER_RESP=$(curl -s -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
echo "$REGISTER_RESP" | jq

# 2️⃣ Request OTP
echo "→ Request OTP"
curl -s -X POST http://localhost:3000/auth/otp \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\"}" >/dev/null

# 3️⃣ Fetch OTP from DB
OTP=""
for i in {1..10}; do
    OTP=$(psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -t -c \
        "SELECT code FROM \"Otp\" WHERE \"userId\" = (SELECT id FROM \"User\" WHERE email='$EMAIL') ORDER BY \"createdAt\" DESC LIMIT 1;")
    OTP=$(echo "$OTP" | tr -d '[:space:]')
    if [[ -n "$OTP" ]]; then
        echo "OTP fetched from DB: $OTP"
        break
    fi
    echo "OTP not yet generated, waiting..."
    sleep 1
done

if [[ -z "$OTP" ]]; then
    echo "Failed to fetch OTP from DB"
    exit 1
fi

# 4️⃣ Verify OTP and get tokens
echo "→ Verify OTP"
VERIFY_RESP=$(curl -s -X POST http://localhost:3000/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"otp\":\"$OTP\"}")
echo "$VERIFY_RESP" | jq

ACCESS_TOKEN=$(echo "$VERIFY_RESP" | jq -r '.accessToken')
REFRESH_TOKEN=$(echo "$VERIFY_RESP" | jq -r '.refreshToken')

# 5️⃣ Refresh token
echo "→ Refresh token"
REFRESH_RESP=$(curl -s -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}")
echo "$REFRESH_RESP" | jq

# 6️⃣ Logout
echo "→ Logout"
LOGOUT_RESP=$(curl -s -X POST http://localhost:3000/auth/logout \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}")
echo "$LOGOUT_RESP" | jq

# 7️⃣ Refresh after logout
echo "→ Refresh after logout"
REFRESH_AFTER_LOGOUT=$(curl -s -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}")
echo "$REFRESH_AFTER_LOGOUT" | jq

echo "==== TEST COMPLETED ===="