export type AppConfig = {
  awsRegion: string;
  cognitoUserPoolId: string;
  cognitoClientId: string;
  dbHost: string;
  dbPort: number;
  dbUser: string;
  dbPassword: string | null;
  dbName: string;
  dbUseIamAuth: boolean;
};

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getConfig(): AppConfig {
  const dbUseIamAuth = process.env.DB_USE_IAM_AUTH === "true";

  return {
    awsRegion: required("AWS_REGION"),
    cognitoUserPoolId: required("COGNITO_USER_POOL_ID"),
    cognitoClientId: required("COGNITO_CLIENT_ID"),
    dbHost: required("DB_HOST"),
    dbPort: Number(process.env.DB_PORT || "5432"),
    dbUser: required("DB_USER"),
    dbPassword: dbUseIamAuth ? null : required("DB_PASSWORD"),
    dbName: required("DB_NAME"),
    dbUseIamAuth
  };
}
