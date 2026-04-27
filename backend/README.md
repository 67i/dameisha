# QX Serverless API (Phase 1)

This directory contains the backend for phase 1:

- Cognito JWT-based auth (Google/Apple/Email OTP via Cognito setup)
- Profile API: `GET /me`, `PATCH /me`, `GET /me/security`
- Order APIs: `GET /orders`, `GET /orders/{id}`
- Purchase intent APIs: `POST /purchase/intents`, `POST /purchase/intents/{id}/confirm`
- Audit logs for every request route

## 1) Prerequisites

- Node.js 20+
- AWS SAM CLI
- Aurora PostgreSQL-compatible database reachable from Lambda
- Cognito User Pool + App Client

## 2) Install

```bash
cd backend
npm install
```

## 3) Build

```bash
npm run build
```

## 4) Database migration

Set environment variables (or load from your shell), then:

```bash
npm run db:migrate
```

The migration creates:

- `users`
- `orders`
- `purchase_intents`
- `audit_logs`

## 5) Local run (SAM)

Create `env.local.json` (copy from `env.example.json` and replace values), then:

```bash
npm run build
npm run start:local
```

## 6) Deploy

Example deploy flow:

```bash
npm run build
sam build --template template.yaml
sam deploy --guided
```

During guided deploy, provide the Cognito IDs and Aurora PostgreSQL connection values requested by `template.yaml`. If your database uses traditional private VPC networking, also provide private subnet IDs and Lambda security group IDs; otherwise leave the VPC parameters empty.

For IAM database authentication, keep `DbUseIamAuth=true`, leave `DbPassword` empty, and provide the RDS DB resource ID in `DbResourceId`. The database user must have the `rds_iam` role in PostgreSQL.

## 7) API behaviors

- All business endpoints require `Authorization: Bearer <JWT>`
- JWT is verified against Cognito JWKS
- User is auto-upserted on first successful request
- Purchase flow in phase 1 is non-payment:
  - Create intent (`draft`)
  - Confirm intent (`submitted`)
  - Linked order status follows intent status (`draft -> submitted`)

## 8) Next phase hooks

Columns already reserved for real payment integration:

- `purchase_intents.payment_provider`
- `purchase_intents.payment_ref`
- `purchase_intents.paid_at`
