import { makePaginated } from "./utils";

export interface ActivityLogGrouped {
  path: string;
  count: number;
  lastCreatedAt: string;
  lastLevel: string;
  lastMessage: string;
}

export interface ActivityLogEntry {
  id: number;
  path: string;
  level: string;
  message: string;
  content: Record<string, unknown> | null;
  nodeId: number | null;
  organizationId: number | null;
  userId: number | null;
  createdAt: string;
}

export const mockActivityLogsGrouped: ActivityLogGrouped[] = [
  {
    path: "/api/directory/nodes/100/footprints",
    count: 5,
    lastCreatedAt: "2026-04-25T10:00:00.000Z",
    lastLevel: "info",
    lastMessage: "Footprint created successfully",
  },
  {
    path: "/api/directory/nodes/100/connections",
    count: 2,
    lastCreatedAt: "2026-04-24T09:00:00.000Z",
    lastLevel: "info",
    lastMessage: "Connection invitation sent",
  },
];

export const mockActivityLogEntries: ActivityLogEntry[] = [
  {
    id: 501,
    path: "/api/directory/nodes/100/footprints",
    level: "info",
    message: "Footprint created successfully",
    content: { footprintId: "footprint-uuid-001" },
    nodeId: 100,
    organizationId: 10,
    userId: 1,
    createdAt: "2026-04-25T10:00:00.000Z",
  },
  {
    id: 500,
    path: "/api/directory/nodes/100/footprints",
    level: "info",
    message: "Footprint import started",
    content: null,
    nodeId: 100,
    organizationId: 10,
    userId: 1,
    createdAt: "2026-04-25T09:55:00.000Z",
  },
];

export const mockActivityLogsListResponse = makePaginated(mockActivityLogsGrouped);

export const mockActivityLogDetailResponse = {
  logs: mockActivityLogEntries,
  total: mockActivityLogEntries.length,
};
