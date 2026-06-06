import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import mysql from "mysql2/promise";

const loadEnvFile = async (fileName) => {
  const filePath = path.join(process.cwd(), fileName);
  const contents = await fs.readFile(filePath, "utf8").catch(() => "");

  contents
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .forEach((line) => {
      const separatorIndex = line.indexOf("=");

      if (separatorIndex === -1) {
        return;
      }

      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();

      if (!process.env[key]) {
        process.env[key] = value.replace(/^["']|["']$/g, "");
      }
    });
};

const requiredEnv = (name) => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
};

await loadEnvFile(".env.local");
await loadEnvFile(".env");

const connection = await mysql.createConnection({
  host: requiredEnv("DB_HOST"),
  port: Number(process.env.DB_PORT ?? 3306),
  database: requiredEnv("DB_NAME"),
  user: requiredEnv("DB_USER"),
  password: requiredEnv("DB_PASSWORD"),
  multipleStatements: true,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: true } : undefined
});

try {
  const schemaPath = path.join(process.cwd(), "sql", "schema.sql");
  const schema = await fs.readFile(schemaPath, "utf8");

  await connection.query(schema);
  console.log("Schema deployed successfully.");
} finally {
  await connection.end();
}
