export const MOBILE_API_VERSION = "v1";

export type MobileTaskStatus = "todo" | "in_progress" | "awaiting_reply" | "done";
export type MobileTaskPriority = "low" | "medium" | "high" | "urgent";
export type MobileMemberRole = "owner" | "admin" | "member";

export type MobileTask = {
  id: string;
  title: string;
  description: string | null;
  status: MobileTaskStatus;
  priority: MobileTaskPriority;
  dueAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MobileWorkspace = {
  id: string;
  name: string;
  role: MobileMemberRole;
};

export type MobileProfile = {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
};

export type MobileMeResponse = {
  profile: MobileProfile;
  activeWorkspace: MobileWorkspace;
  workspaces: MobileWorkspace[];
};

export type MobileTodayResponse = {
  date: string;
  generatedAt: string;
  now: MobileTask[];
  later: MobileTask[];
  openCount: number;
};

export type MobileTasksResponse = {
  tasks: MobileTask[];
};

export type CreateMobileTaskRequest = {
  title: string;
  description?: string | null;
  priority?: MobileTaskPriority;
  dueAt?: string | null;
};

export type MobileApiError = {
  error: {
    code: string;
    message: string;
  };
};
