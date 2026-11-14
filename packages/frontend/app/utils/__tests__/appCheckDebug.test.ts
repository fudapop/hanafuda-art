import { describe, expect, it } from 'vitest'
import { appCheckDebugToken } from '../appCheckDebug'

describe('appCheckDebugToken', () => {
  const token = 'debug-token-do-not-ship'

  it('returns the token only for a development build', () => {
    expect(appCheckDebugToken('development', token)).toBe(token)
  })

  it('never returns a token for production, test, or an unset environment', () => {
    expect(appCheckDebugToken('production', token)).toBe(false)
    expect(appCheckDebugToken('test', token)).toBe(false)
    expect(appCheckDebugToken(undefined, token)).toBe(false)
    expect(appCheckDebugToken('development', undefined)).toBe(false)
    expect(appCheckDebugToken('development', '')).toBe(false)
  })
})
