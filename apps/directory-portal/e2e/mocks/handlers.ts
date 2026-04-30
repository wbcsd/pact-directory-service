import type { Page, Route } from "@playwright/test";
import { mockProfileData, mockLoginResponse, mockForgotPasswordResponse, mockResetPasswordResponse, mockVerifyEmailResponse, mockSetPasswordResponse } from "./data/auth";
import { mockOrganizationListResponse, mockOrganizationDetail, mockCheckNameAvailable } from "./data/organizations";
import { mockUserListResponse, mockUserDetail } from "./data/users";
import { mockNodeListResponse, mockNodeDetail } from "./data/nodes";
import { mockConnectionListResponse, mockInvitationListResponse, mockAcceptInvitationResponse } from "./data/connections";
import { mockFootprintListResponse, mockFootprintDetail } from "./data/footprints";
import { mockPcfRequestListResponse } from "./data/pcf-requests";
import { mockActivityLogsListResponse, mockActivityLogDetailResponse } from "./data/activity-logs";
import { mockTestRunListResponse, mockTestResults, mockPostTestResponse } from "./data/conformance";

const apiBase = process.env.API_BASE_URL ?? "http://localhost:3010/api";

// ---------------------------------------------------------------------------
// Mock handler registry
// Each entry maps a named key to:
//   - method: HTTP method to match (or '*' for any)
//   - pattern: RegExp tested against the URL pathname after the API base path
//   - defaultResponse: the JSON body to fulfill with (status 200)
// ---------------------------------------------------------------------------

interface MockEntry {
  method: string;
  pattern: RegExp;
  defaultResponse: unknown;
}

const mockRegistry: Record<string, MockEntry> = {
  // Auth
  getMe:                   { method: "GET",    pattern: /^\/directory\/users\/me$/,                               defaultResponse: mockProfileData },
  postLogin:               { method: "POST",   pattern: /^\/directory\/users\/login$/,                            defaultResponse: mockLoginResponse },
  postSignup:              { method: "POST",   pattern: /^\/directory\/users\/signup$/,                           defaultResponse: { message: "Registration successful." } },
  getCheckOrgName:         { method: "GET",    pattern: /^\/directory\/organizations\/check-name\//,              defaultResponse: mockCheckNameAvailable },
  postForgotPassword:      { method: "POST",   pattern: /^\/directory\/users\/forgot-password$/,                  defaultResponse: mockForgotPasswordResponse },
  getVerifyResetToken:     { method: "GET",    pattern: /^\/directory\/users\/verify-reset-token\//,              defaultResponse: { valid: true } },
  postResetPassword:       { method: "POST",   pattern: /^\/directory\/users\/reset-password$/,                   defaultResponse: mockResetPasswordResponse },
  postSetPassword:         { method: "POST",   pattern: /^\/directory\/users\/set-password$/,                     defaultResponse: mockSetPasswordResponse },
  postVerifyEmail:         { method: "POST",   pattern: /^\/directory\/users\/verify-email$/,                     defaultResponse: mockVerifyEmailResponse },
  postResendVerification:  { method: "POST",   pattern: /^\/directory\/users\/resend-verification$/,              defaultResponse: { message: "Verification email sent." } },

  // Organizations
  getOrganizations:        { method: "GET",    pattern: /^\/directory\/organizations$/,                           defaultResponse: mockOrganizationListResponse },
  getOrganization:         { method: "GET",    pattern: /^\/directory\/organizations\/\d+$/,                      defaultResponse: mockOrganizationDetail },
  postOrganization:        { method: "POST",   pattern: /^\/directory\/organizations\/\d+$/,                      defaultResponse: mockOrganizationDetail },

  // Users
  getOrgUsers:             { method: "GET",    pattern: /^\/directory\/organizations\/\d+\/users$/,               defaultResponse: mockUserListResponse },
  getOrgUser:              { method: "GET",    pattern: /^\/directory\/organizations\/\d+\/users\/\d+$/,           defaultResponse: mockUserDetail },
  postOrgUser:             { method: "POST",   pattern: /^\/directory\/organizations\/\d+\/users(\/\d+)?$/,        defaultResponse: mockUserDetail },

  // Nodes
  getOrgNodes:             { method: "GET",    pattern: /^\/directory\/organizations\/\d+\/nodes$/,               defaultResponse: mockNodeListResponse },
  getNode:                 { method: "GET",    pattern: /^\/directory\/nodes\/\d+$/,                              defaultResponse: mockNodeDetail },
  postOrgNode:             { method: "POST",   pattern: /^\/directory\/organizations\/\d+\/nodes$/,               defaultResponse: mockNodeDetail },
  putNode:                 { method: "PUT",    pattern: /^\/directory\/nodes\/\d+$/,                              defaultResponse: mockNodeDetail },
  deleteNode:              { method: "DELETE", pattern: /^\/directory\/nodes\/\d+$/,                              defaultResponse: { message: "Node deleted." } },

  // Connections
  getNodeConnections:      { method: "GET",    pattern: /^\/directory\/nodes\/\d+\/connections$/,                 defaultResponse: mockConnectionListResponse },
  getNodeInvitations:      { method: "GET",    pattern: /^\/directory\/nodes\/\d+\/invitations$/,                 defaultResponse: mockInvitationListResponse },
  postNodeInvitation:      { method: "POST",   pattern: /^\/directory\/nodes\/\d+\/invitations$/,                 defaultResponse: { id: 300 } },
  postAcceptInvitation:    { method: "POST",   pattern: /^\/directory\/node-invitations\/\d+\/accept$/,           defaultResponse: mockAcceptInvitationResponse },
  postRejectInvitation:    { method: "POST",   pattern: /^\/directory\/node-invitations\/\d+\/reject$/,           defaultResponse: { message: "Invitation rejected." } },
  deleteInvitation:        { method: "DELETE", pattern: /^\/directory\/node-invitations\/\d+$/,                   defaultResponse: { message: "Invitation deleted." } },

  // Footprints
  getNodeFootprints:       { method: "GET",    pattern: /^\/directory\/nodes\/\d+\/footprints$/,                  defaultResponse: mockFootprintListResponse },
  getFootprint:            { method: "GET",    pattern: /^\/directory\/footprints\//,                             defaultResponse: mockFootprintDetail },
  postNodeFootprints:      { method: "POST",   pattern: /^\/directory\/nodes\/\d+\/footprints$/,                  defaultResponse: { message: "Footprint(s) created." } },

  // PCF Requests
  getNodePcfRequests:      { method: "GET",    pattern: /^\/directory\/nodes\/\d+\/pcf-requests$/,                defaultResponse: mockPcfRequestListResponse },
  postNodePcfRequest:      { method: "POST",   pattern: /^\/directory\/nodes\/\d+\/pcf-requests$/,                defaultResponse: { id: 400 } },
  postRejectPcfRequest:    { method: "POST",   pattern: /^\/directory\/nodes\/\d+\/pcf-requests\/\d+\/reject$/,   defaultResponse: { message: "PCF request rejected." } },
  postFulfillPcfRequest:   { method: "POST",   pattern: /^\/directory\/nodes\/\d+\/pcf-requests\/\d+\/fulfill$/,  defaultResponse: { message: "PCF request fulfilled." } },

  // Activity Logs
  getActivityLogs:         { method: "GET",    pattern: /^\/directory\/activity-logs$/,                           defaultResponse: mockActivityLogsListResponse },
  getActivityLogsByPath:   { method: "GET",    pattern: /^\/directory\/activity-logs\/path$/,                     defaultResponse: mockActivityLogDetailResponse },
  getNodeActivityLogs:     { method: "GET",    pattern: /^\/directory\/activity-logs\/nodes\/\d+$/,               defaultResponse: mockActivityLogsListResponse },

  // Conformance (proxy)
  getTestRuns:             { method: "GET",    pattern: /^\/proxy\/test-runs$/,                                   defaultResponse: mockTestRunListResponse },
  postTest:                { method: "POST",   pattern: /^\/proxy\/test$/,                                        defaultResponse: mockPostTestResponse },
  getTestResults:          { method: "GET",    pattern: /^\/proxy\/test-results$/,                                defaultResponse: mockTestResults },

  // Feedback
  postFeedback:            { method: "POST",   pattern: /^\/directory\/feedback$/,                                defaultResponse: { message: "Feedback submitted." } },
};

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type MockKey = keyof typeof mockRegistry;

/**
 * Per-key response override. Provide a full fetch Response-compatible object
 * or just a body (which will be fulfilled as JSON with status 200).
 */
export type MockOverrides = Partial<Record<MockKey, unknown>>;

// ---------------------------------------------------------------------------
// setupApiMocks
// ---------------------------------------------------------------------------

/**
 * Registers a single Playwright route handler that intercepts all requests to
 * `apiBase/**` and fulfills them with mock responses.
 *
 * @param page      Playwright Page instance
 * @param overrides Per-named-key response overrides for the current test
 */
export async function setupApiMocks(
  page: Page,
  overrides: MockOverrides = {}
): Promise<void> {
  const urlPattern = `${apiBase}/**`;

  await page.route(urlPattern, (route: Route) => {
    const url = new URL(route.request().url());
    const method = route.request().method().toUpperCase();

    // Strip the API base from the pathname so patterns match cleanly
    const basePath = new URL(apiBase).pathname;
    const pathname = url.pathname.startsWith(basePath)
      ? url.pathname.slice(basePath.length)
      : url.pathname;

    // Find the first registry entry whose method and pattern match
    for (const [key, entry] of Object.entries(mockRegistry)) {
      const methodMatches = entry.method === "*" || entry.method === method;
      if (methodMatches && entry.pattern.test(pathname)) {
        const body = overrides[key as MockKey] ?? entry.defaultResponse;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(body),
        });
      }
    }

    // No mock found — return a clear 404 so tests fail loudly
    console.warn(`[mock] No mock for ${method} ${pathname}`);
    return route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ error: `No mock for ${method} ${pathname}` }),
    });
  });
}
