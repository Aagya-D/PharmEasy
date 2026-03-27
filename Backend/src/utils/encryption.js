import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;

const resolveEncryptionSeed = () => {
  const seed = process.env.KHALTI_SECRET_ENCRYPTION_KEY || process.env.JWT_REFRESH_SECRET;
  if (!seed) {
    throw new Error("Missing encryption seed. Set KHALTI_SECRET_ENCRYPTION_KEY in environment.");
  }
  return seed;
};

const deriveKey = () =>
  crypto.createHash("sha256").update(resolveEncryptionSeed()).digest();

export const encryptText = (plainText) => {
  if (plainText === null || plainText === undefined) return null;

  const normalized = String(plainText);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, deriveKey(), iv);

  const encrypted = Buffer.concat([
    cipher.update(normalized, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
};

export const decryptText = (cipherText) => {
  if (!cipherText) return null;

  const [ivHex, authTagHex, encryptedHex] = String(cipherText).split(":");
  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error("Invalid encrypted payload format");
  }

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, deriveKey(), iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
};
