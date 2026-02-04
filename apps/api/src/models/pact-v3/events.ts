/**
 * PACT v3 CloudEvents Types
 * Based on PACT specification and CloudEvents 1.0 format
 */

/**
 * PACT v3 Event Types
 * Following the format: org.wbcsd.pact.ProductFootprint.<EventName>.3
 */
export enum EventTypesV3 {
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
 */
export interface RequestCreatedEventData {
  /**
   * Unique identifier for the request
   */
  requestId: string;

  /**
   * Product ID(s) requested
   */
  productIds?: string[];

  /**
   * Company ID(s) requested
   */
  companyIds?: string[];
}

/**
 * Data payload for RequestFulfilledEvent
 */
export interface RequestFulfilledEventData {
  /**
   * Unique identifier for the request being fulfilled
   */
  requestId: string;

  /**
   * Product footprint IDs that fulfill the request
   */
  pfIds: string[];
}

/**
 * Data payload for RequestRejectedEvent
 */
export interface RequestRejectedEventData {
  /**
   * Unique identifier for the request being rejected
   */
  requestId: string;

  /**
   * Reason for rejection
   */
  reason?: string;
}
