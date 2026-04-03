// Define the schema structure for each version
export interface VersionSchema {
  productFootprint: any;
  listFootprintResponse: any;
  getFootprintResponse: any;
  authTokenResponse: any;
  simpleListFootprintResponse: any;
  simpleGetFootprintResponse: any;
  emptyResponse: any;
  events?: {
    fulfilled: any;
    rejected: any;
    created: any;
    published: any;
  };
}
