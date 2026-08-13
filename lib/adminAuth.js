const crypto = require("crypto");

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;

function hashPassword(password) {
  const value = String(password || "");
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto
    .scryptSync(value, salt, KEY_LENGTH, {
      N: SCRYPT_N,
      r: SCRYPT_R,
      p: SCRYPT_P,
    })
    .toString("hex");

  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt}$${derivedKey}`;
}

function verifyPassword(password, storedHash) {
  if (typeof storedHash !== "string" || !storedHash.startsWith("scrypt$")) {
    return false;
  }

  const [, n, r, p, salt, expectedHash] = storedHash.split("$");
  if (!n || !r || !p || !salt || !expectedHash) {
    return false;
  }

  const derivedKey = crypto
    .scryptSync(String(password || ""), salt, KEY_LENGTH, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    })
    .toString("hex");

  const expectedBuffer = Buffer.from(expectedHash, "hex");
  const actualBuffer = Buffer.from(derivedKey, "hex");

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

function normalizeAdminUsername(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidAdminUsername(value) {
  return /^[a-z0-9_.-]{3,40}$/i.test(String(value || "").trim());
}

module.exports = {
  hashPassword,
  verifyPassword,
  normalizeAdminUsername,
  isValidAdminUsername,
};
