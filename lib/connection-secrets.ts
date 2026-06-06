import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const algorithm = "aes-256-gcm";

const getKey = () => {
  const secret = process.env.CONNECTION_ENCRYPTION_KEY;

  if (!secret) {
    throw new Error("CONNECTION_ENCRYPTION_KEY is required to encrypt connection credentials.");
  }

  return createHash("sha256").update(secret).digest();
};

export const encryptCredentials = (credentials: Record<string, string>) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(credentials), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(".");
};

export const decryptCredentials = (encryptedValue: string): Record<string, string> => {
  const [iv, tag, encrypted] = encryptedValue.split(".");

  if (!iv || !tag || !encrypted) {
    throw new Error("Encrypted credentials are malformed.");
  }

  const decipher = createDecipheriv(algorithm, getKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64")),
    decipher.final()
  ]).toString("utf8");

  return JSON.parse(decrypted) as Record<string, string>;
};
