#!/bin/bash
# Disable history expansion (prevents ! in strings from breaking things)
set +H
set -e

BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
EMAIL="test$(date +%s)@example.com"
PASSWORD="MyT3stPa55word"

# Bypass proxy for local server (HTTP_PROXY/HTTPS_PROXY would route curl through VPN)
export NO_PROXY="127.0.0.1,localhost"
export no_proxy="127.0.0.1,localhost"

CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
DIM='\033[2m'
NC='\033[0m'

pass()  { echo -e "${GREEN}  ✓ $1${NC}"; }
fail()  {
  echo -e "${RED}  ✗ $1${NC}"
  [[ -n "${2:-}" ]] && echo -e "${DIM}    Response: $2${NC}"
  exit 1
}
step()  { echo -e "\n${CYAN}▸ $1${NC}"; }
info()  { echo -e "${DIM}  $1${NC}"; }
warn()  { echo -e "${YELLOW}  ⚠ $1${NC}"; }
# Safe display: pretty-prints JSON if valid, otherwise prints raw
show()  { echo "${1}" | jq . 2>/dev/null || echo "  ${1}"; }

echo -e "${CYAN}"
echo "  ╔══════════════════════════════════╗"
echo "  ║     SSO-IDP  Flow Test           ║"
echo "  ╚══════════════════════════════════╝"
echo -e "${NC}"
echo "  Email : $EMAIL"
echo "  Server: $BASE_URL"

# ─── Check dependencies ───────────────────────────────────────────────────────
step "Checking dependencies"
for cmd in curl jq psql; do
  if ! command -v "$cmd" &>/dev/null; then
    fail "Required tool not found: $cmd" ""
  fi
  info "$cmd found"
done
pass "All dependencies present"

# ─── Check server health ──────────────────────────────────────────────────────
step "Server health check"
curl -s --max-time 5 "$BASE_URL/" -o /dev/null || {
  echo -e "${RED}  ✗ Cannot reach $BASE_URL — is the server running?${NC}"
  echo -e "${DIM}    npm run dev${NC}"
  exit 1
}
pass "Server is up"

# ─── Helper: prompt user to enter OTP from server console ────────────────────
fetch_otp() {
  local otp=""
  while [[ -z "$otp" ]]; do
    echo -e "${YELLOW}  ? Check server console for OTP and enter it here:${NC}" >&2
    read -r otp </dev/tty
    otp=$(echo "$otp" | tr -d '[:space:]')
  done
  echo "$otp"
}

# ─── 1. Register ──────────────────────────────────────────────────────────────
step "1. Register"
REG=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
show "$REG"
echo "$REG" | jq -e '.user' > /dev/null 2>&1 || fail "Registration failed" "$REG"
pass "User registered"

# ─── 2. Duplicate register → expect error ─────────────────────────────────────
step "2. Duplicate register (expect error)"
DUP=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
show "$DUP"
echo "$DUP" | jq -e '.error' > /dev/null 2>&1 || fail "Duplicate register should be rejected" "$DUP"
pass "Duplicate register correctly rejected"

# ─── 3. Request OTP ───────────────────────────────────────────────────────────
step "3. Request OTP"
OTP_REQ=$(curl -s -X POST "$BASE_URL/auth/otp" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\"}")
show "$OTP_REQ"
echo "$OTP_REQ" | jq -e '.message' > /dev/null 2>&1 || fail "OTP request failed" "$OTP_REQ"
pass "OTP requested"

# ─── 4. Fetch OTP from DB ─────────────────────────────────────────────────────
step "4. Fetch OTP from DB"
OTP=$(fetch_otp "$EMAIL") || fail "Could not fetch OTP from DB (check DB credentials and DB_NAME)" ""
pass "OTP fetched: $OTP"

# ─── 5. Wrong OTP → expect error ─────────────────────────────────────────────
step "5. Wrong OTP (expect error)"
WRONG=$(curl -s -X POST "$BASE_URL/auth/verify-otp" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"otp\":\"000000\"}")
show "$WRONG"
echo "$WRONG" | jq -e '.error' > /dev/null 2>&1 || fail "Wrong OTP should be rejected" "$WRONG"
pass "Wrong OTP correctly rejected"

# ─── 6. Verify OTP → get tokens ───────────────────────────────────────────────
step "6. Verify OTP"
VERIFY=$(curl -s -X POST "$BASE_URL/auth/verify-otp" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"otp\":\"$OTP\"}")
show "$VERIFY"
ACCESS=$(echo "$VERIFY" | jq -r '.accessToken' 2>/dev/null || echo "null")
REFRESH=$(echo "$VERIFY" | jq -r '.refreshToken' 2>/dev/null || echo "null")
[[ "$ACCESS" != "null" && -n "$ACCESS" ]] || fail "No access token in verify-otp response" "$VERIFY"
pass "Got tokens via OTP"

# ─── 7. Access profile ────────────────────────────────────────────────────────
step "7. GET /auth/profile"
PROFILE=$(curl -s "$BASE_URL/auth/profile" \
  -H "Authorization: Bearer $ACCESS")
show "$PROFILE"
echo "$PROFILE" | jq -e '.user' > /dev/null 2>&1 || fail "Profile request failed" "$PROFILE"
pass "Profile accessible"

# ─── 8. Profile with no token → expect 401 ───────────────────────────────────
step "8. GET /auth/profile — no token (expect 401)"
UNAUTH=$(curl -s "$BASE_URL/auth/profile")
show "$UNAUTH"
echo "$UNAUTH" | jq -e '.error' > /dev/null 2>&1 || fail "Unauthenticated request should be rejected" "$UNAUTH"
pass "Unauthenticated request correctly rejected"

# ─── 9. Password login ────────────────────────────────────────────────────────
step "9. Login with password"
LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
show "$LOGIN"
LOGIN_ACCESS=$(echo "$LOGIN" | jq -r '.accessToken' 2>/dev/null || echo "null")
[[ "$LOGIN_ACCESS" != "null" && -n "$LOGIN_ACCESS" ]] || fail "Password login failed" "$LOGIN"
pass "Logged in with password"

# ─── 10. Wrong password → expect error ───────────────────────────────────────
step "10. Wrong password (expect error)"
BADPASS=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"wrongpassword\"}")
show "$BADPASS"
echo "$BADPASS" | jq -e '.error' > /dev/null 2>&1 || fail "Wrong password should be rejected" "$BADPASS"
pass "Wrong password correctly rejected"

# ─── 11. Rotate refresh token ─────────────────────────────────────────────────
step "11. Rotate refresh token"
ROTATED=$(curl -s -X POST "$BASE_URL/auth/refresh" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH\"}")
show "$ROTATED"
NEW_REFRESH=$(echo "$ROTATED" | jq -r '.refreshToken' 2>/dev/null || echo "null")
[[ "$NEW_REFRESH" != "null" && -n "$NEW_REFRESH" ]] || fail "Refresh token rotation failed" "$ROTATED"
pass "Got new refresh token"

# ─── 12. Replay old token → expect rejection + session revoke ────────────────
step "12. Replay old refresh token (expect rejection)"
REPLAY=$(curl -s -X POST "$BASE_URL/auth/refresh" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH\"}")
show "$REPLAY"
echo "$REPLAY" | jq -e '.error' > /dev/null 2>&1 || fail "Token replay should be rejected" "$REPLAY"
pass "Token replay correctly rejected (session revoked)"

# ─── 13. New OTP flow to get fresh session for logout test ───────────────────
step "13. Get fresh session for logout test (new OTP)"
NEW_OTP_REQ=$(curl -s -X POST "$BASE_URL/auth/otp" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\"}")
show "$NEW_OTP_REQ"
echo "$NEW_OTP_REQ" | jq -e '.message' > /dev/null 2>&1 || fail "Second OTP request failed" "$NEW_OTP_REQ"

OTP2=$(fetch_otp "$EMAIL") || fail "Could not fetch second OTP from DB" ""
pass "Second OTP fetched: $OTP2"

VERIFY2=$(curl -s -X POST "$BASE_URL/auth/verify-otp" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"otp\":\"$OTP2\"}")
show "$VERIFY2"
FRESH_REFRESH=$(echo "$VERIFY2" | jq -r '.refreshToken' 2>/dev/null || echo "null")
FRESH_ACCESS=$(echo "$VERIFY2" | jq -r '.accessToken' 2>/dev/null || echo "null")
[[ "$FRESH_REFRESH" != "null" && -n "$FRESH_REFRESH" ]] || fail "Could not get fresh tokens" "$VERIFY2"
pass "Fresh tokens obtained"

# ─── 14. Logout ───────────────────────────────────────────────────────────────
step "14. Logout"
LOGOUT=$(curl -s -X POST "$BASE_URL/auth/logout" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$FRESH_REFRESH\"}")
show "$LOGOUT"
echo "$LOGOUT" | jq -e '.message' > /dev/null 2>&1 || fail "Logout failed" "$LOGOUT"
pass "Logged out"

# ─── 15. Refresh after logout → expect rejection ─────────────────────────────
step "15. Refresh after logout (expect rejection)"
POST_LOGOUT=$(curl -s -X POST "$BASE_URL/auth/refresh" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$FRESH_REFRESH\"}")
show "$POST_LOGOUT"
echo "$POST_LOGOUT" | jq -e '.error' > /dev/null 2>&1 || fail "Post-logout refresh should be rejected" "$POST_LOGOUT"
pass "Post-logout refresh correctly rejected"

# ─── 16. Access token after logout (stateless JWT note) ──────────────────────
step "16. Access token validity after logout"
STALE=$(curl -s "$BASE_URL/auth/profile" \
  -H "Authorization: Bearer $FRESH_ACCESS")
show "$STALE"
if echo "$STALE" | jq -e '.user' > /dev/null 2>&1; then
  warn "Access token still valid — expected: JWTs are stateless and remain valid until expiry"
  warn "To invalidate immediately: npm run cli -- user:revoke $EMAIL"
else
  pass "Access token rejected (expired or tokenVersion bumped)"
fi

echo -e "\n${GREEN}  ══════════════════════════════════════${NC}"
echo -e "${GREEN}  All tests passed!${NC}"
echo -e "${GREEN}  ══════════════════════════════════════${NC}\n"
