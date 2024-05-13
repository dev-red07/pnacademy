import {
  createRoleInDB,
  createUser,
  getPasswordById,
  getRoleById,
  getUserByEmail,
  getUserById,
  saveRefreshToken,
  updateUserInDb,
} from "../../model/user/user.model";
import { RoleData, UserData, authTokens } from "../../types/user.types";
import { v4 as uuid } from "uuid";
import { AppError } from "../../lib/appError";
import { hashPassword } from "../../utils/password";
import commonErrorsDictionary from "../../utils/error/commonErrors";
import bcrypt from "bcrypt";
import jwt, { Jwt } from "jsonwebtoken";
import { UUID } from "crypto";
import logger from "../../config/logger";

export const registerUser = async (user: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string | null;
  roleId: string | null;
}): Promise<UserData | null> => {
  const userExists = await getUserByEmail(user.email);
  if (userExists)
    throw new AppError(
      "User already exists",
      409,
      "User with this email already exists",
      false
    );

  const userData = await createUser({
    id: uuid(),
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    password: await hashPassword(user.password),
    phone: user.phone,
    roleId: user.roleId,
  });

  if (!userData) {
    throw new AppError(
      commonErrorsDictionary.internalServerError.name,
      commonErrorsDictionary.internalServerError.httpCode,
      "Someting went wrong",
      false
    );
  }

  return userData;
};

export const updateUser = async (ToBeUpdatedUser: {
  id: UUID;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  password: string | null;
  phone: string | null;
  roleId: string | null;
}): Promise<UserData | null> => {
  const existingUser = await getUserById(ToBeUpdatedUser.id);
  if (!existingUser) {
    throw new AppError(
      "User not found",
      404,
      "User with this id does not exist",
      false
    );
  }
  const UpdatedUser = await updateUserInDb({
    id: ToBeUpdatedUser.id,
    firstName: ToBeUpdatedUser.firstName,
    lastName: ToBeUpdatedUser.lastName,
    email: ToBeUpdatedUser.email,
    phone: ToBeUpdatedUser.phone,
    roleId: ToBeUpdatedUser.roleId,
  });

  if (UpdatedUser === null) {
    throw new AppError(
      commonErrorsDictionary.internalServerError.name,
      commonErrorsDictionary.internalServerError.httpCode,
      "Something went wrong while updating user",
      false
    );
  }
  return UpdatedUser;
}

export const loginUser = async (user: {
  email: string;
  password: string;
}): Promise<authTokens> => {
  const existingUser = await getUserByEmail(user.email)
  if (!existingUser)
    throw new AppError(
      "Invalid credentials",
      401,
      "Invalid credentials",
      false
    )

  const correctPassword = (await getPasswordById(existingUser.id))?.password ?? ''

  if (! await bcrypt.compare(user.password, correctPassword))
    throw new AppError(
      "Invalid credentials",
      401,
      "Invalid credentials",
      false
    )

  if (!existingUser.role_id)
    throw new AppError(
      "Role not assigned",
      401,
      "Role not assigned",
      false
    )

  const userRole = await getRoleById(existingUser.role_id)
  const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET
  if (!accessTokenSecret)
    throw new AppError(
      "Internal server error",
      500,
      "Access token secret not found",
      false
    )

  const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET
  if (!refreshTokenSecret)
    throw new AppError(
      "Internal server error",
      500,
      "Refresh token secret not found",
      false
    )

    const grantedPermissions = [
      userRole?.canManageAssessment ? 'canManageAssessment' : '',
      userRole?.canManageUser ? 'canManageUser' : '',
      userRole?.canManageRole ? 'canManageRole' : '',
      userRole?.canManageNotification ? 'canManageNotification' : '',
      userRole?.canManageLocalGroup ? 'canManageLocalGroup' : '',
      userRole?.canManageReports ? 'canManageReports' : '',
      userRole?.canAttemptAssessment ? 'canAttemptAssessment' : '',
      userRole?.canViewReport ? 'canViewReport' : '',
      userRole?.canManageMyAccount ? 'canManageMyAccount' : '',
      userRole?.canViewNotification ? 'canViewNotification' : '',
   ].filter(permission => permission !== '')

  const accessToken = jwt.sign({
    userId: existingUser.id,
    roleId: existingUser.role_id,
    permissions: grantedPermissions
  },
    accessTokenSecret,
    {
      expiresIn: '15m'
    }
  )

  const refreshToken = jwt.sign({
    userId: existingUser.id,
  },
    refreshTokenSecret,
    {
      expiresIn: '7d'
    }
  )

  if (! await saveRefreshToken({ userId: existingUser.id, refreshToken }))
    throw new AppError(
      "Internal server error",
      500,
      "Error saving refresh token",
      false
    )

  return {
    accessToken,
    refreshToken
  }
}

export const newAccessToken = async (refreshToken: string): Promise<string> => {
  let userId: string = '' 
  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET as string, (err: any, user: any) => {
    if (err) {
      logger.error(`Error verifying accesss token: ${err}`)
      throw new AppError(
        "Token not valid",
        commonErrorsDictionary.forbidden.httpCode,
        "Token not valid",
        false
      ) 
    }

    userId = user.userId
  })

  const existingUser = await getUserById(userId)
  if (!existingUser)
    throw new AppError(
      "User not found",
      401,
      "User not found",
      false
    )


  if (!existingUser.role_id)
    throw new AppError(
      "Role not assigned",
      401,
      "Role not assigned",
      false
    ) 

  const userRole = await getRoleById(existingUser.role_id)
  const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET
  if (!accessTokenSecret)
    throw new AppError(
      "Internal server error",
      500,
      "Access token secret not found",
      false
    )

    const grantedPermissions = [
      userRole?.canManageAssessment ? 'canManageAssessment' : '',
      userRole?.canManageUser ? 'canManageUser' : '',
      userRole?.canManageRole ? 'canManageRole' : '',
      userRole?.canManageNotification ? 'canManageNotification' : '',
      userRole?.canManageLocalGroup ? 'canManageLocalGroup' : '',
      userRole?.canManageReports ? 'canManageReports' : '',
      userRole?.canAttemptAssessment ? 'canAttemptAssessment' : '',
      userRole?.canViewReport ? 'canViewReport' : '',
      userRole?.canManageMyAccount ? 'canManageMyAccount' : '',
      userRole?.canViewNotification ? 'canViewNotification' : '',
   ].filter(permission => permission !== '')

  const accessToken = jwt.sign({
    userId: existingUser.id,
    roleId: existingUser.role_id,
    permissions: grantedPermissions
  },
    accessTokenSecret,
    {
      expiresIn: '15m'
    }
  )

  return accessToken
}

export const createRole = async (role: {
  name: string;
  canManageAssessment: boolean;
  canManageUser: boolean;
  canManageRole: boolean;
  canManageNotification: boolean;
  canManageLocalGroup: boolean;
  canManageReports: boolean;
  canAttemptAssessment: boolean;
  canViewReport: boolean;
  canManageMyAccount: boolean;
  canViewNotification: boolean;
}): Promise<RoleData | null> => {

  const roleData = await createRoleInDB({
    id: uuid(),
    name: role.name,
    canManageAssessment: role.canManageAssessment,
    canManageUser: role.canManageUser,
    canManageRole: role.canManageRole,
    canManageNotification: role.canManageNotification,
    canManageLocalGroup: role.canManageLocalGroup,
    canManageReports: role.canManageReports,
    canAttemptAssessment: role.canAttemptAssessment,
    canViewReport: role.canViewReport,
    canManageMyAccount: role.canManageMyAccount,
    canViewNotification: role.canViewNotification,
  })

  return roleData;
};
