/**
 * PACT v3 CloudEvents Types
 * Based on PACT specification and CloudEvents 1.0 format
 */

/**
 * PACT v3 Event Types
 * Following the format: org.wbcsd.pact.ProductFootprint.<EventName>.3
 */
export enum EventTypes {
  /**
   * A new request for product footprint data has been created
   */
  REQUEST_CREATED = "org.wbcsd.pact.ProductFootprint.RequestCreatedEvent.3",

  /**
   * A previously created request has been fulfilled with data
   */
  REQUEST_FULFILLED = "org.wbcsd.pact.ProductFootprint.RequestFulfilledEvent.3",

  /**
   * A previously created request has been rejected
   */
  REQUEST_REJECTED = "org.wbcsd.pact.ProductFootprint.RequestRejectedEvent.3",

  /**
   * A product footprint has been published or updated
   */
  PUBLISHED = "org.wbcsd.pact.ProductFootprint.PublishedEvent.3",
}

/**
 * CloudEvents 1.0 format
 * See: https://github.com/cloudevents/spec/blob/v1.0/spec.md
 */
export interface CloudEvent<T = Record<string, any>> {
  /**
   * Event type (e.g., org.wbcsd.pact.ProductFootprint.PublishedEvent.3)
   */
  type: string;

  /**
   * CloudEvents specification version (should be "1.0")
   */
  specversion: string;

  /**
   * Unique identifier for this event
   */
  id: string;

  /**
   * Source system that generated the event (URI format)
   */
  source: string;

  /**
   * Timestamp when the event occurred (ISO 8601)
   */
  time: string;

  /**
   * Event-specific data payload
   */
  data: T;

  /**
   * Optional: subject of the event
   */
  subject?: string;

  /**
   * Optional: content type of the data (e.g., "application/json")
   */
  datacontenttype?: string;
}

/**
 * Data payload for PublishedEvent
 */
export interface PublishedEventData {
  /**
   * Array of product footprint IDs that were published or updated
   */
  pfIds: string[];
}

/**
 * Data payload for RequestCreatedEvent
 * Per PACT v3 spec: `productId` is an array of product IDs
 */
export interface RequestCreatedEventData {
  /**
   * Product ID(s) requested
   */
  productId: string[];

  /**
   * Optional: comment or additional information
   */
  comment?: string;
}

/**
 * Data payload for RequestFulfilledEvent
 * Per PACT v3 spec: `requestEventId` references the original request,
 * and `pfs` contains the matching product footprints
 */
export interface RequestFulfilledEventData {
  /**
   * Unique identifier for the request being fulfilled
   */
  requestEventId: string;

  /**
   * Array of product footprints that fulfill the request
   */
  pfs: Record<string, any>[];
}

/**
 * Data payload for RequestRejectedEvent
 * Per PACT v3 spec: `requestEventId` references the original request,
 * and `error` provides details about the rejection
 */
export interface RequestRejectedEventData {
  /**
   * Unique identifier for the request being rejected
   */
  requestEventId: string;

  /**
   * Error details for the rejection
   */
  error: {
    /**
     * Error code
     */
    code: string;

    /**
     * Error message
     */
    message: string;
  };
}
