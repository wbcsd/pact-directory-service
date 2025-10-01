export const featureFlags = {
  enableIdentityManagement: import.meta.env.VITE_ENABLE_IM === 'true',
  enableOrganizationManagement: import.meta.env.VITE_ENABLE_OM === 'true',
};
