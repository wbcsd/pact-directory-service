// Re-export all generated types from the v3.0 spec
export * from './types';

// PACT v3 CloudEvent type identifiers.
// These string constants are part of the data model specification, not the
// client implementation. They belong here rather than in pact-api-client.
export enum EventTypes {
  RequestCreated   = 'org.wbcsd.pact.ProductFootprint.RequestCreatedEvent.3',
  RequestFulfilled = 'org.wbcsd.pact.ProductFootprint.RequestFulfilledEvent.3',
  RequestRejected  = 'org.wbcsd.pact.ProductFootprint.RequestRejectedEvent.3',
  Published        = 'org.wbcsd.pact.ProductFootprint.PublishedEvent.3',
}
