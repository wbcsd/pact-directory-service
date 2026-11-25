import React, { createContext, useContext, useState, ReactNode } from "react";
import { fetchWithAuth } from "../utils/auth-fetch";

// Define our profile data type
export interface ProfileData {
  id: number;
  organizationName: string;
  organizationIdentifier: string | null;
  organizationId: number;
  fullName: string;
  email: string;
  role: string;
  status: string;
  organizationDescription?: string | null;
  solutionApiUrl?: string | null;
  policies?: string[];
}

// Define the context shape
interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  profileData: ProfileData | null;
  login: (token: string) => Promise<void>;
  logout: () => void;
  refreshProfileData: () => Promise<void>;
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: false,
  profileData: null,
  login: async () => {},
  logout: () => {},
  refreshProfileData: async () => {},
});

// Create a hook for easy access to the context
export const useAuth = () => useContext(AuthContext);


// Create the provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(
    !!localStorage.getItem("jwt")
  );
  const [profileData, setProfileData] = useState<ProfileData | null>(null);

  // Fetch profile data from the API — throws on failure so callers can handle it
  const fetchProfileData = async (): Promise<ProfileData> => {
    const response = await fetchWithAuth("/users/me");
    if (!response || !response.ok) {
      throw new Error("Failed to fetch profile data");
    }
    return response.json();
  };

  // Login function - stores token and fetches profile data
  const login = async (token: string): Promise<void> => {
    localStorage.setItem("jwt", token);
    setIsAuthenticated(true);
    try {
      const userData = await fetchProfileData();
      setProfileData(userData);
    } catch (error) {
      console.error("Error fetching profile data after login:", error);
    }
  };

  // Logout function
  const logout = (): void => {
    localStorage.removeItem("jwt");
    setIsAuthenticated(false);
    setProfileData(null);
  };

  // Function to refresh profile data when needed
  const refreshProfileData = async (): Promise<void> => {
    if (isAuthenticated) {
      try {
        const userData = await fetchProfileData();
        setProfileData(userData);
      } catch (error) {
        console.error("Error refreshing profile data:", error);
      }
    }
  };

  // Check for token and load profile data on initial render.
  // isLoading starts true when a token exists; we validate it here before
  // marking the user as authenticated so pages never render with expired credentials.
  React.useEffect(() => {
    const loadInitialData = async () => {
      const token = localStorage.getItem("jwt");
      if (!token) return;
      try {
        const userData = await fetchProfileData();
        setIsAuthenticated(true);
        setProfileData(userData);
      } catch {
        // Token invalid or expired — clear state and let auth-fetch redirect to /login
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        profileData,
        login,
        logout,
        refreshProfileData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
