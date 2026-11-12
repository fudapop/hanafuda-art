import type { ActionCodeSettings } from 'firebase/auth'

/**
 * Password-reset and email-action helpers.
 *
 * Firebase's hosted handler (`/__/auth/action` on the auth domain) is what
 * players hit today. This module is the in-app replacement: loading the page
 * may only *check* an oobCode. `confirmPasswordReset` and `applyActionCode`
 * consume the code, so they run from a button press and never from page load.
 * Email scanners that prefetch the link, or that execute the page, therefore
 * cannot burn a reset code.
 */

const AUTH_ACTION_MODES = ['resetPassword', 'verifyEmail', 'recoverEmail'] as const

export type AuthActionMode = (typeof AUTH_ACTION_MODES)[number]

export type ParsedAuthAction = {
  mode: AuthActionMode | 'unknown'
  oobCode: string
  continueUrl: string | null
  lang: string | null
}

export type AuthLoadOperation =
  | { operation: 'verifyPasswordResetCode'; oobCode: string }
  | { operation: 'checkActionCode'; oobCode: string }
  | { operation: 'none'; reason: 'missing-code' | 'unsupported-mode' }

export type AuthSubmitOperation = 'confirmPasswordReset' | 'applyActionCode'

export type AuthActionErrorKind = 'expired' | 'disabled' | 'weak-password' | 'network' | 'generic'

export type PasswordRequirementFlags = {
  length: boolean
  number: boolean
  upper: boolean
  lower: boolean
  special: boolean
}

const SPECIAL_CHARACTER = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/

const CREDENTIAL_FAILURES = new Set([
  'auth/invalid-credential',
  'auth/wrong-password',
  'auth/user-not-found',
  'auth/invalid-login-credentials',
  'auth/invalid-email',
])

/** First string in a Vue Router query value. Ignores null entries and arrays. */
export function firstQueryValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === 'string') return item
    }
  }
  return ''
}

/**
 * Repair an oobCode that an email client turned `+` into a space for.
 * Does not otherwise decode the code — Firebase already parsed the query.
 */
export function normalizeOobCode(code: string): string {
  return code.trim().replace(/ /g, '+')
}

/** Read `mode`, `oobCode`, and `continueUrl` from a Firebase action link. */
export function parseAuthActionParams(query: Record<string, unknown>): ParsedAuthAction {
  const modeRaw = firstQueryValue(query.mode)
  const mode = (AUTH_ACTION_MODES as readonly string[]).includes(modeRaw)
    ? (modeRaw as AuthActionMode)
    : 'unknown'
  const continueUrl = firstQueryValue(query.continueUrl)
  const lang = firstQueryValue(query.lang)
  return {
    mode,
    oobCode: normalizeOobCode(firstQueryValue(query.oobCode)),
    continueUrl: continueUrl || null,
    lang: lang || null,
  }
}

/**
 * What to call when the action page loads.
 * `verifyPasswordResetCode` and `checkActionCode` do not consume the oobCode.
 */
export function actionToPerformOnLoad(action: ParsedAuthAction): AuthLoadOperation {
  if (!action.oobCode) return { operation: 'none', reason: 'missing-code' }
  if (action.mode === 'resetPassword') {
    return { operation: 'verifyPasswordResetCode', oobCode: action.oobCode }
  }
  if (action.mode === 'verifyEmail' || action.mode === 'recoverEmail') {
    return { operation: 'checkActionCode', oobCode: action.oobCode }
  }
  return { operation: 'none', reason: 'unsupported-mode' }
}

/**
 * What to call after the player submits the form.
 * Both operations consume the oobCode, so this must not run on page load.
 */
export function actionToPerformOnSubmit(action: ParsedAuthAction): AuthSubmitOperation | null {
  if (!action.oobCode) return null
  if (action.mode === 'resetPassword') return 'confirmPasswordReset'
  if (action.mode === 'verifyEmail' || action.mode === 'recoverEmail') return 'applyActionCode'
  return null
}

export function emailFromActionCodeInfo(info: {
  data?: { email?: string | null; previousEmail?: string | null }
}): string {
  return info.data?.previousEmail || info.data?.email || ''
}

/**
 * Continue URL passed to `sendPasswordResetEmail`. This is where the player
 * goes after choosing a password. It is not the link in the email — that
 * action URL is set in the Firebase console (see the pull request notes).
 *
 * `handleCodeInApp` stays false so Firebase keeps sending a normal HTTPS
 * action link (`mode` + `oobCode`) instead of a mobile in-app link.
 */
export function buildPasswordResetActionCodeSettings(continueUrl: string): ActionCodeSettings {
  const parsed = new URL(continueUrl)
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Password reset continue URL must be http(s)')
  }
  return {
    url: parsed.toString(),
    handleCodeInApp: false,
  }
}

/** Absolute continue URL for the localized sign-in page. */
export function passwordResetContinueUrl(origin: string, signInPath: string): string {
  const path = signInPath.startsWith('/') ? signInPath : `/${signInPath}`
  return new URL(path, origin).toString()
}

export function createPasswordResetRequest(email: string, continueUrl: string) {
  return {
    email: email.trim(),
    settings: buildPasswordResetActionCodeSettings(continueUrl),
  }
}

/**
 * Same-origin path to send the player to after the action succeeds.
 * Anything off-origin (or unparseable) falls back to sign-in so a crafted
 * `continueUrl` cannot redirect away from the app.
 */
export function safeContinuePath(
  continueUrl: string | null,
  origin: string,
  fallback = '/sign-in',
): string {
  if (!continueUrl) return fallback
  try {
    const parsed = new URL(continueUrl)
    const allowed = new URL(origin)
    if (parsed.origin !== allowed.origin) return fallback
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return fallback
    return `${parsed.pathname}${parsed.search}${parsed.hash}` || fallback
  } catch {
    return fallback
  }
}

export function passwordRequirementFlags(password: string): PasswordRequirementFlags {
  return {
    length: password.length >= 6,
    number: /\d/.test(password),
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    special: SPECIAL_CHARACTER.test(password),
  }
}

export function passwordMeetsPolicy(password: string): boolean {
  const flags = passwordRequirementFlags(password)
  return flags.length && flags.number && flags.upper && flags.lower && flags.special
}

export function firebaseErrorCode(err: unknown): string | null {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const code = (err as { code: unknown }).code
    if (typeof code === 'string') return code
  }
  return null
}

/**
 * Message key for a failed email/password sign-in.
 *
 * Firebase email enumeration protection (on by default) returns
 * `auth/invalid-credential` for a wrong password, an unknown user, and an
 * account that exists only as Google or GitHub and has no password.
 * `fetchSignInMethodsForEmail` is empty in that mode, so the UI cannot say
 * which of those it was. The credential message tells the player to use the
 * provider button or to set a password from Forgot password.
 */
export function emailLoginErrorMessageKey(err: unknown): string {
  const code = firebaseErrorCode(err)
  if (code === 'auth/too-many-requests') return 'auth.messages.tooManyAttempts'
  if (code === 'auth/user-disabled') return 'auth.messages.accountDisabled'
  if (code === null || CREDENTIAL_FAILURES.has(code)) return 'auth.messages.invalidEmailOrPassword'
  return 'auth.messages.unableToSignIn'
}

export function classifyAuthActionError(err: unknown): AuthActionErrorKind {
  switch (firebaseErrorCode(err)) {
    case 'auth/expired-action-code':
    case 'auth/invalid-action-code':
      return 'expired'
    case 'auth/user-disabled':
    case 'auth/user-not-found':
      return 'disabled'
    case 'auth/weak-password':
      return 'weak-password'
    case 'auth/network-request-failed':
      return 'network'
    default:
      return 'generic'
  }
}
