// Define the schema structure for each version
export interface Schema {
  ProductFootprint: any;
  ListFootprintResponse: any;
  GetFootprintResponse: any;
  AuthTokenResponse: any;
  SimpleListFootprintResponse: any;
  SimpleGetFootprintResponse: any;
  EmptyResponse: any;
  RequestCreatedEvent?: any;
  RequestFulfilledEvent?: any;
  RequestRejectedEvent?: any;
  PublishedEvent?: any;
}
