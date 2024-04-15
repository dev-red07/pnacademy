export type UserData = {
  id: string;
  role_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
}

export type authTokens = {
  accessToken: string
  refreshToken: string
}

export type RoleData = {
  id: string;
  name: string;
  canManageAssessment: boolean;
  canManageUser: boolean;
  canManageRole: boolean;
  canManageNotification: boolean;
  canManageLocalGroup: boolean;
  canAttemptAssessment: boolean;
  canViewReport: boolean;
  canManageMyAccount: boolean;
  canViewNotification: boolean;
};
