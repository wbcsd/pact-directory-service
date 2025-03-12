const logoutUser = () => {
  localStorage.clear();
  window.location.href = "/login";
};

const authFetch = async (
  apiBasePath: string,
  url: string,
  options: RequestInit = {}
) => {
  const accessToken = localStorage.getItem("jwt");
  if (!accessToken) {
    return logoutUser();
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  };

  const response = await fetch(apiBasePath + url, { ...options, headers });

  if (response.status === 401) {
    return logoutUser();
  }

  return response;
};

export const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const apiBasePath = `${import.meta.env.VITE_DIRECTORY_API_URL}`;
  return authFetch(apiBasePath, url, options);
};

export const proxyWithAuth = async (url: string, options: RequestInit = {}) => {
  const apiBasePath = `${import.meta.env.VITE_PROXY_API_URL}`;
  return authFetch(apiBasePath, url, options);
};
