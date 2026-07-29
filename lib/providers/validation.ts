import type { z } from "zod";
import type { ProviderKind } from "@/lib/providers/contracts";
import {
  ProviderResponseError,
  type ProviderOperation,
} from "@/lib/providers/errors";

export function parseProviderResponse<T>(
  schema: z.ZodType<T>,
  value: unknown,
  context: {
    providerId: string;
    providerKind: ProviderKind;
    operation?: ProviderOperation;
  },
): T {
  const result = schema.safeParse(value);

  if (result.success) {
    return result.data;
  }

  throw new ProviderResponseError({
    providerId: context.providerId,
    providerKind: context.providerKind,
    operation: context.operation ?? "normalise_response",
    cause: result.error,
    issues: result.error.issues.map((issue) => ({
      path: issue.path.map(String).join("."),
      message: issue.message,
      code: issue.code,
    })),
  });
}
