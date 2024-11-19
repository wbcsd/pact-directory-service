/**
 * Express router paths go here.
 */

export default {
  DirectoryBase: "/api/directory",
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
} as const;
