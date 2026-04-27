# AWS Purchase And Setup Runbook (Phase 1)

This runbook is optimized for:

- primary overseas traffic
- small-scale validation
- order flow without real payment charging

## 1) Purchase / enable in AWS account

1. `Amazon Cognito`
2. `Amazon API Gateway (HTTP API)`
3. `AWS Lambda`
4. `Amazon Aurora Serverless v2 (PostgreSQL-compatible)`
5. `Amazon S3` + `Amazon CloudFront`
6. `Amazon SES`
7. `Amazon CloudWatch` + `AWS X-Ray`
8. `AWS Secrets Manager`
9. `AWS WAF`

Recommended region: `us-east-1` for phase 1.

## 2) Provision order (exact sequence)

1. Create Aurora cluster (Serverless v2, PostgreSQL-compatible), private subnets, security group, and DB user.
2. Create Cognito User Pool and App Client.
3. Configure Cognito federated IdP:
   - Google
   - Apple
   - Email OTP (passwordless flow via Cognito setup)
4. Store DB and OAuth secrets in Secrets Manager.
5. Build and deploy API (`backend/template.yaml`).
6. Create WAF web ACL and attach to API Gateway stage.
7. Verify SES domain/email identity and move out of sandbox when ready.
8. Deploy frontend static assets to S3 and publish through CloudFront.
9. Point frontend API base URL to deployed API Gateway endpoint.

## 3) Required environment variables

- `AWS_REGION`
- `COGNITO_USER_POOL_ID`
- `COGNITO_CLIENT_ID`
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `DB_USE_IAM_AUTH`
- `DbResourceId`
- `VpcSubnetIds` (optional when the database exposes an internet access gateway)
- `VpcSecurityGroupIds` (optional when the database exposes an internet access gateway)

Use `env.example.json` as a template for local/SAM runtime values.

For Lambda in private subnets, ensure the subnets can reach Cognito JWKS endpoints for JWT verification, either through NAT or equivalent outbound routing. If the database uses the RDS internet access gateway instead of traditional VPC networking, leave `VpcSubnetIds` and `VpcSecurityGroupIds` empty.

If using IAM DB authentication, set `DB_USE_IAM_AUTH=true`, leave `DB_PASSWORD` empty, and grant the database user the PostgreSQL `rds_iam` role.

## 4) Security baseline

1. API must require bearer JWT for all business routes.
2. WAF rate-limit rule enabled.
3. No secrets in frontend or source code.
4. DB only reachable from Lambda/VPC scope.
5. CloudWatch alarms:
   - Lambda error count
   - API 5xx rate
   - DB connection saturation

## 5) Smoke test checklist

1. `GET /health` returns `200`.
2. `GET /me` without token returns `401`.
3. Valid Cognito token can call `GET /me`.
4. `PATCH /me` updates profile fields.
5. `POST /purchase/intents` creates draft intent.
6. `POST /purchase/intents/{id}/confirm` updates to submitted.
7. `GET /orders` shows linked order records.
