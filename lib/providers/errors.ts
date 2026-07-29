import type { z } from "zod";
import type { ProviderKind } from "@/lib/providers/contracts";

export type ProviderErrorCode =
  | "authentication_failed"
  | "invalid_request"
  | "malformed_response"
  | "no_results"
  | "no_route"
  | "not_configured"
  | "rate_limited"
  | "timeout"
  | "unavailable"
  | "unsupported";

export type ProviderOperation =
  "enrich_place" | "nearby_places" | "normalise_response" | "walking_route";

export type ProviderErrorOptions = {
  providerId: string;
  providerKind: ProviderKind;
  operation: ProviderOperation;
  code: ProviderErrorCode;
  retryable: boolean;
  message: string;
  cause?: unknown;
};

export class ProviderError extends Error {
  readonly providerId: string;
  readonly providerKind: ProviderKind;
  readonly operation: ProviderOperation;
  readonly code: ProviderErrorCode;
  readonly retryable: boolean;

  constructor(options: ProviderErrorOptions) {
    super(options.message, { cause: options.cause });
    this.name = "ProviderError";
    this.providerId = options.providerId;
    this.providerKind = options.providerKind;
    this.operation = options.operation;
    this.code = options.code;
    this.retryable = options.retryable;
  }
}

export class PlacesProviderError extends ProviderError {
  constructor(options: Omit<ProviderErrorOptions, "providerKind">) {
    super({ ...options, providerKind: "places" });
    this.name = "PlacesProviderError";
  }
}

export class RoutingProviderError extends ProviderError {
  constructor(options: Omit<ProviderErrorOptions, "providerKind">) {
    super({ ...options, providerKind: "routing" });
    this.name = "RoutingProviderError";
  }
}

export class KnowledgeProviderError extends ProviderError {
  constructor(options: Omit<ProviderErrorOptions, "providerKind">) {
    super({ ...options, providerKind: "knowledge" });
    this.name = "KnowledgeProviderError";
  }
}

export type ProviderSchemaIssue = {
  path: string;
  message: string;
  code: string;
};

export class ProviderResponseError extends ProviderError {
  readonly issues: ProviderSchemaIssue[];

  constructor({
    cause,
    issues,
    operation,
    providerId,
    providerKind,
  }: {
    cause: z.ZodError;
    issues: ProviderSchemaIssue[];
    operation: ProviderOperation;
    providerId: string;
    providerKind: ProviderKind;
  }) {
    super({
      providerId,
      providerKind,
      operation,
      code: "malformed_response",
      retryable: false,
      message: `${providerId} returned malformed ${providerKind} data.`,
      cause,
    });
    this.name = "ProviderResponseError";
    this.issues = issues;
  }
}
