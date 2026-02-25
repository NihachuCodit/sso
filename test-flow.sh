#!/bin/bash

BASE_URL="http://localhost:3000"

clean_token() {
  echo "$1" | tr -d '\r\n" '
}

echo "==== SSO FLOW TEST ===="

# =========================
# 1. REGISTER USER
# =========================
echo "→ Register user"

curl -s -X POST $BASE_URL/auth/register \
-H "Content-Type: application/json" \
-d '{
  "email":"test@example.com",
  "password":"Password123!"
}' | jq

echo -e "\n"

# =========================
# 2. LOGIN USER
# =========================
echo "→ Login user"

LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/auth/login \
-H "Content-Type: application/json" \
-d '{
  "email":"test@example.com",
  "password":"Password123!"
}')

echo "$LOGIN_RESPONSE" | jq

ACCESS_TOKEN=$(clean_token "$(echo "$LOGIN_RESPONSE" | jq -r '.accessToken')")
REFRESH_TOKEN=$(clean_token "$(echo "$LOGIN_RESPONSE" | jq -r '.refreshToken')")

echo "Access Token saved"
echo "Refresh Token saved"

echo -e "\n"

# =========================
# 3. REQUEST OTP
# =========================
echo "→ Request OTP"

OTP_RESPONSE=$(curl -s -X POST $BASE_URL/auth/otp \
-H "Content-Type: application/json" \
-d '{
  "email":"test@example.com"
}')

echo "$OTP_RESPONSE" | jq

OTP=$(echo "$OTP_RESPONSE" | jq -r '.otp')

echo "OTP = $OTP"

echo -e "\n"

# =========================
# 4. VERIFY OTP
# =========================
echo "→ Verify OTP"

VERIFY_RESPONSE=$(curl -s -X POST $BASE_URL/auth/verify-otp \
-H "Content-Type: application/json" \
-d "{
  \"email\":\"test@example.com\",
  \"otp\":\"$OTP\"
}")

echo "$VERIFY_RESPONSE" | jq

echo -e "\n"

# =========================
# 5. REFRESH TOKEN
# =========================
echo "→ Refresh token"

REFRESH_RESPONSE=$(curl -s -X POST $BASE_URL/auth/refresh \
-H "Content-Type: application/json" \
-d "{
  \"refreshToken\":\"$REFRESH_TOKEN\"
}")

echo "$REFRESH_RESPONSE" | jq

echo -e "\n"

# =========================
# 6. LOGOUT
# =========================
echo "→ Logout"

curl -s -X POST $BASE_URL/auth/logout \
-H "Content-Type: application/json" \
-d "{
  \"refreshToken\":\"$REFRESH_TOKEN\"
}" | jq

echo -e "\n"

echo "==== TEST COMPLETED ===="