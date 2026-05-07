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
  [[ -n "${2:-}" ]] && echo -e "${DIM}    Ответ: $2${NC}"
  exit 1
}
step()  { echo -e "\n${CYAN}▸ $1${NC}"; }
info()  { echo -e "${DIM}  $1${NC}"; }
warn()  { echo -e "${YELLOW}  ⚠ $1${NC}"; }
show()  { echo "${1}" | jq . 2>/dev/null || echo "  ${1}"; }

# Cookie jar — refresh-токен хранится в httpOnly cookie на сервере
COOKIES=$(mktemp)
OLD_COOKIES=$(mktemp)
trap "rm -f '$COOKIES' '$OLD_COOKIES'" EXIT

echo -e "${CYAN}"
echo "  ╔══════════════════════════════════╗"
echo "  ║     SSO-IDP  Сквозной тест       ║"
echo "  ╚══════════════════════════════════╝"
echo -e "${NC}"
echo "  Email : $EMAIL"
echo "  Сервер: $BASE_URL"

# ─── Проверка зависимостей ────────────────────────────────────────────────────
step "Проверка зависимостей"
for cmd in curl jq; do
  if ! command -v "$cmd" &>/dev/null; then
    fail "Утилита не найдена: $cmd" ""
  fi
  info "$cmd найден"
done
pass "Все зависимости присутствуют"

# ─── Проверка сервера ─────────────────────────────────────────────────────────
step "Проверка доступности сервера"
curl -s --max-time 5 "$BASE_URL/" -o /dev/null || {
  echo -e "${RED}  ✗ Сервер недоступен: $BASE_URL — запущен ли сервер?${NC}"
  echo -e "${DIM}    npm run dev${NC}"
  exit 1
}
pass "Сервер доступен"

# ─── Вспомогательная функция: получить OTP через dev-эндпоинт (до 3с) ────────
fetch_otp() {
  local email="$1"
  local otp=""
  local attempts=0
  while [[ -z "$otp" && $attempts -lt 6 ]]; do
    sleep 0.5
    local resp
    resp=$(curl -s "$BASE_URL/dev/otp?email=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$email" 2>/dev/null || printf '%s' "$email" | sed 's/@/%40/g')")
    otp=$(echo "$resp" | jq -r '.otp // empty' 2>/dev/null)
    attempts=$((attempts + 1))
  done
  if [[ -z "$otp" ]]; then
    echo -e "${RED}  ✗ Не удалось получить OTP — NODE_ENV установлен в production?${NC}" >&2
    exit 1
  fi
  echo "$otp"
}

# ─── 1. Регистрация ───────────────────────────────────────────────────────────
step "1. Регистрация нового пользователя"
REG=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
show "$REG"
echo "$REG" | jq -e '.user' > /dev/null 2>&1 || fail "Регистрация не удалась" "$REG"
pass "Пользователь зарегистрирован"

# ─── 2. Повторная регистрация незаверенного пользователя → разрешена ──────────
step "2. Повторная регистрация (пользователь не подтверждён — ожидаем успех)"
DUP=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
show "$DUP"
echo "$DUP" | jq -e '.user' > /dev/null 2>&1 || fail "Повторная регистрация незаверенного пользователя должна проходить" "$DUP"
pass "Повторная регистрация разрешена (пользователь ещё не подтверждён)"

# ─── 3. Запрос OTP ───────────────────────────────────────────────────────────
step "3. Запрос одноразового кода (OTP)"
OTP_REQ=$(curl -s -X POST "$BASE_URL/auth/otp" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\"}")
show "$OTP_REQ"
echo "$OTP_REQ" | jq -e '.message' > /dev/null 2>&1 || fail "Запрос OTP не удался" "$OTP_REQ"
pass "OTP запрошен, письмо отправлено"

# ─── 4. Получение OTP ────────────────────────────────────────────────────────
step "4. Получение OTP из кэша"
OTP=$(fetch_otp "$EMAIL") || fail "Не удалось получить OTP" ""
pass "OTP получен: $OTP"

# ─── 5. Неверный OTP → ожидаем ошибку ────────────────────────────────────────
step "5. Ввод неверного OTP (ожидаем отказ)"
WRONG=$(curl -s -X POST "$BASE_URL/auth/verify-otp" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"otp\":\"000000\"}")
show "$WRONG"
echo "$WRONG" | jq -e '.error' > /dev/null 2>&1 || fail "Неверный OTP должен быть отклонён" "$WRONG"
pass "Неверный OTP отклонён"

# ─── 6. Подтверждение OTP → получение токенов ────────────────────────────────
step "6. Подтверждение OTP и получение токенов"
VERIFY=$(curl -s -X POST "$BASE_URL/auth/verify-otp" \
  -c "$COOKIES" -b "$COOKIES" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"otp\":\"$OTP\"}")
show "$VERIFY"
ACCESS=$(echo "$VERIFY" | jq -r '.accessToken // empty' 2>/dev/null)
[[ -n "$ACCESS" ]] || fail "Токен доступа не получен" "$VERIFY"
pass "Токены получены (refresh — в httpOnly cookie)"

# ─── 7. Доступ к профилю ─────────────────────────────────────────────────────
step "7. GET /auth/profile — авторизованный запрос"
PROFILE=$(curl -s "$BASE_URL/auth/profile" \
  -H "Authorization: Bearer $ACCESS")
show "$PROFILE"
echo "$PROFILE" | jq -e '.user' > /dev/null 2>&1 || fail "Запрос профиля не удался" "$PROFILE"
pass "Профиль доступен"

# ─── 8. Профиль без токена → ожидаем 401 ─────────────────────────────────────
step "8. GET /auth/profile — без токена (ожидаем отказ)"
UNAUTH=$(curl -s "$BASE_URL/auth/profile")
show "$UNAUTH"
echo "$UNAUTH" | jq -e '.error' > /dev/null 2>&1 || fail "Запрос без авторизации должен быть отклонён" "$UNAUTH"
pass "Неавторизованный запрос отклонён"

# ─── 9. Вход по паролю ───────────────────────────────────────────────────────
step "9. Вход по логину и паролю"
LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -c "$COOKIES" -b "$COOKIES" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
show "$LOGIN"
LOGIN_ACCESS=$(echo "$LOGIN" | jq -r '.accessToken // empty' 2>/dev/null)
[[ -n "$LOGIN_ACCESS" ]] || fail "Вход по паролю не удался" "$LOGIN"
pass "Вход выполнен"

# ─── 10. Неверный пароль → ожидаем ошибку ────────────────────────────────────
step "10. Ввод неверного пароля (ожидаем отказ)"
BADPASS=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"wrongpassword\"}")
show "$BADPASS"
echo "$BADPASS" | jq -e '.error' > /dev/null 2>&1 || fail "Неверный пароль должен быть отклонён" "$BADPASS"
pass "Неверный пароль отклонён"

# ─── 11. Ротация refresh-токена ──────────────────────────────────────────────
step "11. Ротация refresh-токена"
cp "$COOKIES" "$OLD_COOKIES"
ROTATED=$(curl -s -X POST "$BASE_URL/auth/refresh" \
  -c "$COOKIES" -b "$COOKIES" \
  -H "Content-Type: application/json")
show "$ROTATED"
NEW_ACCESS=$(echo "$ROTATED" | jq -r '.accessToken // empty' 2>/dev/null)
[[ -n "$NEW_ACCESS" ]] || fail "Ротация refresh-токена не удалась" "$ROTATED"
pass "Новый refresh-токен получен"

# ─── 12. Повторное использование старого токена → ожидаем отказ ──────────────
step "12. Повторное использование старого refresh-токена (ожидаем отказ)"
REPLAY=$(curl -s -X POST "$BASE_URL/auth/refresh" \
  -b "$OLD_COOKIES" \
  -H "Content-Type: application/json")
show "$REPLAY"
echo "$REPLAY" | jq -e '.error' > /dev/null 2>&1 || fail "Повторное использование токена должно быть отклонено" "$REPLAY"
pass "Повторное использование токена отклонено, сессия отозвана"

# ─── 13. Новая сессия для теста выхода ───────────────────────────────────────
step "13. Получение новой сессии для теста выхода"
NEW_OTP_REQ=$(curl -s -X POST "$BASE_URL/auth/otp" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\"}")
show "$NEW_OTP_REQ"
echo "$NEW_OTP_REQ" | jq -e '.message' > /dev/null 2>&1 || fail "Повторный запрос OTP не удался" "$NEW_OTP_REQ"

OTP2=$(fetch_otp "$EMAIL") || fail "Не удалось получить второй OTP" ""
pass "Второй OTP получен: $OTP2"

VERIFY2=$(curl -s -X POST "$BASE_URL/auth/verify-otp" \
  -c "$COOKIES" -b "$COOKIES" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"otp\":\"$OTP2\"}")
show "$VERIFY2"
FRESH_ACCESS=$(echo "$VERIFY2" | jq -r '.accessToken // empty' 2>/dev/null)
[[ -n "$FRESH_ACCESS" ]] || fail "Не удалось получить новые токены" "$VERIFY2"
pass "Новые токены получены"

# ─── 14. Выход ───────────────────────────────────────────────────────────────
step "14. Выход из системы"
LOGOUT=$(curl -s -X POST "$BASE_URL/auth/logout" \
  -c "$COOKIES" -b "$COOKIES" \
  -H "Content-Type: application/json")
show "$LOGOUT"
echo "$LOGOUT" | jq -e '.message' > /dev/null 2>&1 || fail "Выход не удался" "$LOGOUT"
pass "Выход выполнен"

# ─── 15. Обновление токена после выхода → ожидаем отказ ──────────────────────
step "15. Refresh-токен после выхода (ожидаем отказ)"
POST_LOGOUT=$(curl -s -X POST "$BASE_URL/auth/refresh" \
  -c "$COOKIES" -b "$COOKIES" \
  -H "Content-Type: application/json")
show "$POST_LOGOUT"
echo "$POST_LOGOUT" | jq -e '.error' > /dev/null 2>&1 || fail "Refresh после выхода должен быть отклонён" "$POST_LOGOUT"
pass "Refresh после выхода отклонён"

# ─── 16. Access-токен после выхода (JWT — stateless) ─────────────────────────
step "16. Проверка access-токена после выхода"
STALE=$(curl -s "$BASE_URL/auth/profile" \
  -H "Authorization: Bearer $FRESH_ACCESS")
show "$STALE"
if echo "$STALE" | jq -e '.user' > /dev/null 2>&1; then
  warn "Access-токен всё ещё действителен — JWT stateless, живёт до истечения срока"
  warn "Для немедленного отзыва: npm run cli -- user:revoke $EMAIL"
else
  pass "Access-токен отклонён (истёк или версия токена изменена)"
fi

echo -e "\n${GREEN}  ══════════════════════════════════════${NC}"
echo -e "${GREEN}  Все тесты пройдены успешно!${NC}"
echo -e "${GREEN}  ══════════════════════════════════════${NC}\n"
