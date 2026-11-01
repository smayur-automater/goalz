export { createGoalzClient } from './client';
export type { GoalzClient, GoalzClientOptions } from './client';
export {
  completeRedirect,
  sendMagicLink,
  signInWithIdToken,
  signInWithOAuth,
  signOut,
  verifyEmailCode,
} from './auth';
export type { AuthErrorCode, AuthResult, SignUpDetails } from './auth';
export { buildExportFiles, deleteAccount, fetchMyData } from './account';
export type { MyData } from './account';
export { toCsv } from './csv';
