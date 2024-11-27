import { randomBytes } from "crypto";
import { promisify } from "util";

const randomBytesAsync = promisify(randomBytes);

async function generateRandomString(length: number): Promise<string> {
  const buffer = await randomBytesAsync(length);
  return buffer.toString("hex");
}

export async function generateCredentials(): Promise<{
  clientId: string;
  clientSecret: string;
}> {
  const clientId = await generateRandomString(16);
  const clientSecret = await generateRandomString(32);

  return { clientId, clientSecret };
}
