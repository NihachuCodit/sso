// Set required env vars before any module is evaluated
process.env.JWT_SECRET         = "test-access-secret"
process.env.JWT_REFRESH_SECRET = "test-refresh-secret"
process.env.NODE_ENV           = "test"
