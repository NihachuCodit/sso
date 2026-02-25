# SSO Identity Provider

```bash 

## 1. Requirements

- Node.js >= 18
- npm >= 9
- PostgreSQL >= 14
- Docker (optional)
- Git

## 2. Clone repository

git clone https://github.com/<your-username>/sso-idp.git
cd sso-idp

## 3. Install dependencies

npm install

## 4. Environment configuration

Create .env file in the project root:

DATABASE_URL="postgresql://postgres:password@localhost:5432/sso_db"
JWT_SECRET="your_super_secret_key"
PORT=3000

## 5. Database setup

Create database manually:

CREATE DATABASE sso_db;

Run Prisma migrations:

npx prisma migrate dev

(Optional) Open Prisma Studio:

npx prisma studio

## 6. Run development server

npm run dev

Server starts at:

http://localhost:3000

## 7. Test authentication flow

Run automated test script:

chmod +x test-flow.sh
./test-flow.sh

This script performs:

Register user

Login

Request OTP

Verify OTP

Refresh token

Logout

## 8. Manual API testing

Example: Login request

curl -X POST http://localhost:3000/auth/login \
-H "Content-Type: application/json" \
-d '{
  "email":"test@example.com",
  "password":"Password123!"
}'

## 9. Production build

npm run build
npm start

## 10. Docker (optional)

Build container:

docker build -t sso-idp .

Run container:

docker run -p 3000:3000 --env-file .env sso-idp

## 11. Useful commands

Run tests: 

npm test

Generate Prisma client:

npx prisma generate

Reset database:

npx prisma migrate reset