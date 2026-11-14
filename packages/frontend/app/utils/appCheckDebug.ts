/**
 * @fileoverview Decides whether a Firebase App Check debug token may be used.
 *
 * VueFire copies `appCheck.debug` into public runtime config, which is shipped
 * in the client bundle. Production builds must receive `false`, never the token.
 */

/**
 * Returns the debug token for a dev build only.
 *
 * @param nodeEnv - `process.env.NODE_ENV` when the Nuxt config is evaluated
 * @param token - `APPCHECK_DEBUG_TOKEN`, when one is configured
 * @returns The token in development, otherwise `false`
 */
export function appCheckDebugToken(
  nodeEnv: string | undefined,
  token: string | undefined,
): string | false {
  if (nodeEnv !== 'development') return false
  if (!token) return false
  return token
}
