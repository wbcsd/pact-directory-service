import React, { createContext, useContext, useState, ReactNode } from "react";
import { fetchWithAuth } from "../utils/auth-fetch";

// Define our profile data type
export interface ProfileData {
  organizationName: string;
  organizationIdentifier: string;
  organizationDescription: string;
  organizationId: number;
  fullName: string;
  email: string;
  role: string; // 'user' | 'administrator'
  solutionApiUrl: string;
  registrationCode: string;
  clientId: string;
  clientSecret: string;
  networkKey: string;
}

// Define the context shape
interface AuthContextType {
  isAuthenticated: boolean;
  profileData: ProfileData | null;
  login: (token: string) => Promise<void>;
  logout: () => void;
  refreshProfileData: () => Promise<void>;
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  profileData: null,
  login: async () => {},
  logout: () => {},
  refreshProfileData: async () => {},
});

// Create a hook for easy access to the context
export const useAuth = () => useContext(AuthContext);

// Default empty profile data
const emptyProfileData: ProfileData = {
  organizationName: "",
  organizationIdentifier: "",
  organizationDescription: "",
  organizationId: 0,
  fullName: "",
  email: "",
  role: "user", // Default to 'user' role
  solutionApiUrl: "",
  registrationCode: "",
  clientId: "",
  clientSecret: "",
  networkKey: "",
};

// Create the provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    !!localStorage.getItem("jwt")
  );
  const [profileData, setProfileData] = useState<ProfileData | null>(null);

  // Fetch profile data from the API
  const fetchProfileData = async (): Promise<ProfileData> => {
    try {
      const response = await fetchWithAuth("/users/me");

      if (!response || !response.ok) {
        throw new Error("Failed to fetch profile data");
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching profile data:", error);
      return emptyProfileData;
    }
  };

  // Login function - stores token and fetches profile data
  const login = async (token: string): Promise<void> => {
    localStorage.setItem("jwt", token);
    setIsAuthenticated(true);

    // Fetch profile data immediately after login
    const userData = await fetchProfileData();
    setProfileData(userData);
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
      const userData = await fetchProfileData();
      setProfileData(userData);
    }
  };

  // Check for token and load profile data on initial render
  React.useEffect(() => {
    const loadInitialData = async () => {
      const token = localStorage.getItem("jwt");
      if (token) {
        setIsAuthenticated(true);
        const userData = await fetchProfileData();
        setProfileData(userData);
      }
    };

    loadInitialData();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
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
