export * from './types';

// PACT v2.x CloudEvent type identifiers.
// These string constants are part of the data model specification, not the
// client implementation. They belong here rather than in pact-api-client.
export enum EventTypes {
  RequestCreated   = "org.wbcsd.pathfinder.ProductFootprintRequest.Created.v1",
  RequestFulfilled = "org.wbcsd.pathfinder.ProductFootprintRequest.Fulfilled.v1",
  RequestRejected  = "org.wbcsd.pathfinder.ProductFootprintRequest.Rejected.v1",
  Published        = "org.wbcsd.pathfinder.ProductFootprint.Published.v1",
}
