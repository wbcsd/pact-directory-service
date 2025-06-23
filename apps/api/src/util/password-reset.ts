import crypto from "crypto";
import { db } from "@src/database/db";

/**
 * Generate a secure random token for password reset
 */
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Create a password reset token for a user
 */
export async function createPasswordResetToken(
  userId: number
): Promise<string> {
  const token = generateResetToken();
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 minutes expiration

  await db
    .insertInto("password_reset_tokens")
    .values({
      userId,
      token,
      expiresAt,
      createdAt: new Date(),
    })
    .execute();

  return token;
}

/**
 * Validate a password reset token
 */
export async function validateResetToken(token: string): Promise<{
  isValid: boolean;
  userId?: number;
  error?: string;
}> {
  const resetToken = await db
    .selectFrom("password_reset_tokens")
    .selectAll()
    .where("token", "=", token)
    .where("usedAt", "is", null)
    .executeTakeFirst();

  if (!resetToken) {
    return { isValid: false, error: "Invalid or expired reset token" };
  }

  if (new Date() > resetToken.expiresAt) {
    return { isValid: false, error: "Reset token has expired" };
  }

  return { isValid: true, userId: resetToken.userId };
}

/**
 * Mark a password reset token as used
 */
export async function markTokenAsUsed(token: string): Promise<void> {
  await db
    .updateTable("password_reset_tokens")
    .set({ usedAt: new Date() })
    .where("token", "=", token)
    .execute();
}

/**
 * Clean up expired tokens (should be run periodically)
 */
export async function cleanupExpiredTokens(): Promise<void> {
  await db
    .deleteFrom("password_reset_tokens")
    .where("expiresAt", "<", new Date())
    .execute();
}
