export type ProductEventName =
  | "location_prompt_viewed"
  | "location_request_started"
  | "location_granted"
  | "location_accuracy_rejected"
  | "location_denied"
  | "location_deferred";

export type ProductEvent = {
  name: ProductEventName;
  properties: Record<string, string | number | boolean>;
};

const PRODUCT_EVENT_NAME = "wanderfound:analytics";

export function trackProductEvent(
  name: ProductEventName,
  properties: ProductEvent["properties"] = {},
) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<ProductEvent>(PRODUCT_EVENT_NAME, {
      detail: { name, properties },
    }),
  );
}

export { PRODUCT_EVENT_NAME };
