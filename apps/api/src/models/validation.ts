import { ZodType, z } from "zod";

type Validated<T> =
  | {
      success: true;
      value: T;
    }
  | {
      success: false;
      error: string;
    };

export function validate<T>(data: unknown, schema: ZodType<T>): Validated<T> {
  try {
    const value = schema.parse(data);
    return { success: true, value };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map((err) => err.message).join(", ");
      return { success: false, error: errorMessages };
    } else {
      return { success: false, error: (error as { message: string }).message };
    }
  }
}
