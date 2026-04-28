CREATE TABLE IF NOT EXISTS users (
  user_id VARCHAR(128) NOT NULL PRIMARY KEY,
  email VARCHAR(255) NULL,
  phone_number VARCHAR(64) NULL,
  display_name VARCHAR(120) NULL,
  country_code VARCHAR(16) NULL,
  avatar_url VARCHAR(512) NULL,
  login_providers JSONB NULL,
  last_login_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS purchase_intents (
  intent_id BIGSERIAL PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'cancelled')),
  product_code VARCHAR(100) NOT NULL,
  quantity INT NOT NULL,
  currency CHAR(3) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  note TEXT NULL,
  payment_provider VARCHAR(64) NULL,
  payment_ref VARCHAR(128) NULL,
  paid_at TIMESTAMPTZ NULL,
  submitted_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT fk_purchase_intents_user FOREIGN KEY (user_id) REFERENCES users(user_id)
);
CREATE INDEX IF NOT EXISTS idx_purchase_intents_user_status ON purchase_intents (user_id, status);
CREATE INDEX IF NOT EXISTS idx_purchase_intents_created_at ON purchase_intents (created_at);

CREATE TABLE IF NOT EXISTS orders (
  order_id BIGSERIAL PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'cooling_period' CHECK (status IN ('cooling_period', 'active', 'completed', 'refunded')),
  currency CHAR(3) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  source_intent_id BIGINT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(user_id),
  CONSTRAINT fk_orders_intent FOREIGN KEY (source_intent_id) REFERENCES purchase_intents(intent_id)
);
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders (user_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at);

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
UPDATE orders
SET status = CASE
  WHEN status = 'draft' THEN 'cooling_period'
  WHEN status = 'submitted' THEN 'active'
  WHEN status = 'cancelled' THEN 'refunded'
  ELSE status
END
WHERE status IN ('draft', 'submitted', 'cancelled');
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'cooling_period';
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN ('cooling_period', 'active', 'completed', 'refunded'));

CREATE TABLE IF NOT EXISTS audit_logs (
  audit_id BIGSERIAL PRIMARY KEY,
  user_id VARCHAR(128) NULL,
  method VARCHAR(16) NOT NULL,
  route VARCHAR(255) NOT NULL,
  status_code INT NOT NULL,
  request_id VARCHAR(128) NULL,
  created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id);
