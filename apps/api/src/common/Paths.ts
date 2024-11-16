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
  },
  Users: {
    Base: "/users",
    Get: "/all",
    Add: "/add",
    Update: "/update",
    Delete: "/delete/:id",
  },
} as const;
