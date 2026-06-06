import mysql, { type Pool, type PoolOptions } from "mysql2/promise";

let pool: Pool | null = null;

const requiredEnv = (name: string) => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
};

export const getDatabaseConfig = (): PoolOptions => {
  const sslEnabled = process.env.DB_SSL === "true";

  return {
    host: requiredEnv("DB_HOST"),
    port: Number(process.env.DB_PORT ?? 3306),
    database: requiredEnv("DB_NAME"),
    user: requiredEnv("DB_USER"),
    password: requiredEnv("DB_PASSWORD"),
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: true,
    multipleStatements: false,
    ssl: sslEnabled ? { rejectUnauthorized: true } : undefined
  };
};

export const db = () => {
  if (!pool) {
    pool = mysql.createPool(getDatabaseConfig());
  }

  return pool;
};

export const closeDb = async () => {
  if (!pool) {
    return;
  }

  await pool.end();
  pool = null;
};
