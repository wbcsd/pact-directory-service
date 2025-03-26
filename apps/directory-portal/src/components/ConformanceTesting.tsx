import React, { createContext, useContext, useState, ReactNode } from "react";

interface ConformanceTestingContextProps {
  apiUrl: string;
  authBaseUrl: string;
  clientId: string;
  clientSecret: string;
  version: string;
  setVersion: (version: string) => void;
  setApiUrl: (url: string) => void;
  setAuthBaseUrl: (url: string) => void;
  setClientId: (id: string) => void;
  setClientSecret: (secret: string) => void;
}

const ConformanceTestingContext = createContext<
  ConformanceTestingContextProps | undefined
>(undefined);

interface ConformanceTestingProviderProps {
  children: ReactNode;
}

export const ConformanceTestingProvider: React.FC<
  ConformanceTestingProviderProps
> = ({ children }) => {
  const [apiUrl, setApiUrl] = useState<string>("");
  const [authBaseUrl, setAuthBaseUrl] = useState<string>("");
  const [clientId, setClientId] = useState<string>("");
  const [clientSecret, setClientSecret] = useState<string>("");
  const [version, setVersion] = useState<string>("V2.0");

  return (
    <ConformanceTestingContext.Provider
      value={{
        apiUrl,
        authBaseUrl,
        clientId,
        clientSecret,
        version,
        setApiUrl,
        setAuthBaseUrl,
        setClientId,
        setClientSecret,
        setVersion,
      }}
    >
      {children}
    </ConformanceTestingContext.Provider>
  );
};

export const useConformanceTesting = (): ConformanceTestingContextProps => {
  const context = useContext(ConformanceTestingContext);
  if (!context) {
    throw new Error(
      "useConformanceTesting must be used within a ConformanceTestingProvider"
    );
  }
  return context;
};
