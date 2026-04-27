import { Signer } from "@aws-sdk/rds-signer";
import { Pool, QueryResult, QueryResultRow } from "pg";
import { getConfig } from "../config";

let pool: Pool | null = null;

function createPasswordProvider(config: ReturnType<typeof getConfig>): string | (() => Promise<string>) {
  if (!config.dbUseIamAuth) {
    return config.dbPassword ?? "";
  }

  const signer = new Signer({
    hostname: config.dbHost,
    port: config.dbPort,
    username: config.dbUser,
    region: config.awsRegion
  });

  return () => signer.getAuthToken();
}

function getPool(): Pool {
  if (pool) {
    return pool;
  }

  const config = getConfig();
  pool = new Pool({
    host: config.dbHost,
    port: config.dbPort,
    user: config.dbUser,
    password: createPasswordProvider(config),
    database: config.dbName,
    max: 8,
    ssl: {
      rejectUnauthorized: false
    }
  });
  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const result = await getPool().query<T>(sql, params);
  return result.rows;
}

export async function execute(sql: string, params: unknown[] = []): Promise<QueryResult> {
  return getPool().query(sql, params);
}
