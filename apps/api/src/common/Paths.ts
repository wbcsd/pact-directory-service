/**
 * Express router paths go here.
 */

export default {
  DirectoryBase: "/api/directory",
  IdentityProviderBase: "/api/im",
  ProxyBase: "/api/proxy",
  Companies: {
    Base: "/companies",
    Signup: "/signup",
    Login: "/login",
    MyProfile: "/my-profile",
    Profile: "/profile/:id",
    Search: "/search",
    CreateConnectionRequest: "/create-connection-request",
    ConnectionRequesAction: "/connection-request-action",
  },
  Users: {
    Base: "/users",
    Get: "/all",
    Add: "/add",
    Update: "/update",
    Delete: "/delete/:id",
  },
  Auth: {
    Base: "/auth",
    Token: "/token",
  },
  Proxy: {
    Base: "/",
    Test: "/test",
    TestResults: "/test-results",
    recentTestRuns: "/test-runs",
  },
} as const;
