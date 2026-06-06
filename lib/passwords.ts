import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";

const iterations = 210000;
const keyLength = 32;
const digest = "sha256";

export const hashPassword = (password: string) => {
  const salt = randomBytes(16).toString("base64url");
  const hash = pbkdf2Sync(password, salt, iterations, keyLength, digest).toString("base64url");

  return `pbkdf2_${digest}$${iterations}$${salt}$${hash}`;
};

export const verifyPassword = (password: string, storedHash: string) => {
  const [algorithm, iterationValue, salt, hash] = storedHash.split("$");
  const [, storedDigest] = algorithm.split("_");
  const storedIterations = Number(iterationValue);

  if (!storedDigest || !Number.isInteger(storedIterations) || !salt || !hash) {
    return false;
  }

  const expected = Buffer.from(hash, "base64url");
  const actual = pbkdf2Sync(password, salt, storedIterations, expected.length, storedDigest).toString("base64url");
  const actualBuffer = Buffer.from(actual, "base64url");

  return expected.length === actualBuffer.length && timingSafeEqual(expected, actualBuffer);
};
