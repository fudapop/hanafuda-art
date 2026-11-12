import { describe, expect, it } from 'vitest'
import {
  actionToPerformOnLoad,
  actionToPerformOnSubmit,
  buildPasswordResetActionCodeSettings,
  classifyAuthActionError,
  createPasswordResetRequest,
  emailFromActionCodeInfo,
  emailLoginErrorMessageKey,
  normalizeOobCode,
  parseAuthActionParams,
  passwordMeetsPolicy,
  passwordRequirementFlags,
  passwordResetContinueUrl,
  safeContinuePath,
} from '../authAction'

const CONSUMING = new Set(['confirmPasswordReset', 'applyActionCode'])

describe('parseAuthActionParams', () => {
  it('reads a password reset link and repairs spaces in the oobCode', () => {
    const parsed = parseAuthActionParams({
      mode: 'resetPassword',
      oobCode: 'abc def+xyz',
      continueUrl: 'https://newhanafuda.art/sign-in',
      lang: 'en',
      apiKey: 'ignored',
    })

    expect(parsed).toEqual({
      mode: 'resetPassword',
      oobCode: 'abc+def+xyz',
      continueUrl: 'https://newhanafuda.art/sign-in',
      lang: 'en',
    })
  })

  it('takes the first string when a query value is repeated', () => {
    expect(
      parseAuthActionParams({
        mode: ['resetPassword', 'verifyEmail'],
        oobCode: [null, 'code'],
      }).oobCode,
    ).toBe('code')
  })

  it('treats a missing or unknown mode as unknown and a missing code as empty', () => {
    expect(parseAuthActionParams({}).mode).toBe('unknown')
    expect(parseAuthActionParams({ mode: 'signIn', oobCode: 'x' }).mode).toBe('unknown')
    expect(parseAuthActionParams({ mode: 'resetPassword' }).oobCode).toBe('')
  })
})

describe('normalizeOobCode', () => {
  it('trims and turns spaces back into plus signs', () => {
    expect(normalizeOobCode('  ab cd  ')).toBe('ab+cd')
  })
})

describe('action code is not consumed on load', () => {
  it('only verifies a reset code when the page loads', () => {
    const action = parseAuthActionParams({ mode: 'resetPassword', oobCode: 'code-1' })
    const load = actionToPerformOnLoad(action)

    expect(load).toEqual({ operation: 'verifyPasswordResetCode', oobCode: 'code-1' })
    expect(CONSUMING.has(load.operation)).toBe(false)
  })

  it('only checks verify and recover links on load', () => {
    for (const mode of ['verifyEmail', 'recoverEmail'] as const) {
      const load = actionToPerformOnLoad(parseAuthActionParams({ mode, oobCode: 'code-2' }))
      expect(load.operation).toBe('checkActionCode')
      expect(CONSUMING.has(load.operation)).toBe(false)
    }
  })

  it('does not call Firebase when the code or mode is missing', () => {
    expect(actionToPerformOnLoad(parseAuthActionParams({ mode: 'resetPassword' }))).toEqual({
      operation: 'none',
      reason: 'missing-code',
    })
    expect(actionToPerformOnLoad(parseAuthActionParams({ mode: 'nope', oobCode: 'x' }))).toEqual({
      operation: 'none',
      reason: 'unsupported-mode',
    })
  })

  it('confirms the reset only as the submit operation', () => {
    const action = parseAuthActionParams({ mode: 'resetPassword', oobCode: 'code-1' })
    expect(actionToPerformOnSubmit(action)).toBe('confirmPasswordReset')
    expect(
      actionToPerformOnSubmit(parseAuthActionParams({ mode: 'verifyEmail', oobCode: 'c' })),
    ).toBe('applyActionCode')
    expect(actionToPerformOnSubmit(parseAuthActionParams({ mode: 'resetPassword' }))).toBeNull()
  })
})

describe('password reset email settings', () => {
  it('passes an absolute continue URL and does not handle the code in the app', () => {
    const request = createPasswordResetRequest(
      '  player@example.com ',
      passwordResetContinueUrl('https://newhanafuda.art', '/ja/sign-in'),
    )

    expect(request.email).toBe('player@example.com')
    expect(request.settings).toEqual({
      url: 'https://newhanafuda.art/ja/sign-in',
      handleCodeInApp: false,
    })
  })

  it('keeps the local origin and port', () => {
    expect(passwordResetContinueUrl('http://localhost:8888', '/sign-in')).toBe(
      'http://localhost:8888/sign-in',
    )
  })

  it('rejects a continue URL that is not http(s)', () => {
    expect(() => buildPasswordResetActionCodeSettings('javascript:alert(1)')).toThrow(/http/)
  })
})

describe('safeContinuePath', () => {
  it('keeps a same-origin path and drops off-site urls', () => {
    expect(
      safeContinuePath('https://newhanafuda.art/ja/sign-in?x=1', 'https://newhanafuda.art'),
    ).toBe('/ja/sign-in?x=1')
    expect(safeContinuePath('https://evil.example/phish', 'https://newhanafuda.art')).toBe(
      '/sign-in',
    )
    expect(safeContinuePath('not a url', 'https://newhanafuda.art')).toBe('/sign-in')
    expect(safeContinuePath(null, 'https://newhanafuda.art', '/ja/sign-in')).toBe('/ja/sign-in')
  })

  it('does not return a protocol-relative path for a same-host URL', () => {
    const fallback = '/sign-in'
    expect(
      safeContinuePath('https://newhanafuda.art//evil.example', 'https://newhanafuda.art'),
    ).toBe(fallback)
    expect(
      safeContinuePath('https://newhanafuda.art/\\evil.example', 'https://newhanafuda.art'),
    ).toBe(fallback)
    expect(
      safeContinuePath(
        'https://newhanafuda.art/sign-in/../../\\evil.example',
        'https://newhanafuda.art',
      ),
    ).toBe(fallback)
    expect(
      safeContinuePath('https://newhanafuda.art/%2F%2Fevil.example', 'https://newhanafuda.art'),
    ).toBe(fallback)
    expect(
      safeContinuePath('https://newhanafuda.art/%5C%5Cevil.example', 'https://newhanafuda.art'),
    ).toBe(fallback)
  })
})

describe('password policy', () => {
  it('requires length, number, both cases, and a special character', () => {
    expect(passwordMeetsPolicy('Ab1!')).toBe(false)
    expect(passwordRequirementFlags('Abcdef1!')).toEqual({
      length: true,
      number: true,
      upper: true,
      lower: true,
      special: true,
    })
    expect(passwordMeetsPolicy('Abcdef1!')).toBe(true)
    expect(passwordMeetsPolicy('abcdef1!')).toBe(false)
  })
})

describe('email sign-in errors', () => {
  it('uses one message for wrong password and a provider-only account', () => {
    const key = 'auth.messages.invalidEmailOrPassword'
    expect(emailLoginErrorMessageKey({ code: 'auth/invalid-credential' })).toBe(key)
    expect(emailLoginErrorMessageKey({ code: 'auth/wrong-password' })).toBe(key)
    expect(emailLoginErrorMessageKey({ code: 'auth/user-not-found' })).toBe(key)
    expect(emailLoginErrorMessageKey(new Error('no code'))).toBe(key)
  })

  it('distinguishes lockout and disabled accounts', () => {
    expect(emailLoginErrorMessageKey({ code: 'auth/too-many-requests' })).toBe(
      'auth.messages.tooManyAttempts',
    )
    expect(emailLoginErrorMessageKey({ code: 'auth/user-disabled' })).toBe(
      'auth.messages.accountDisabled',
    )
    expect(emailLoginErrorMessageKey({ code: 'auth/network-request-failed' })).toBe(
      'auth.messages.unableToSignIn',
    )
  })
})

describe('classifyAuthActionError', () => {
  it('maps expired and invalid codes to the same player-facing kind', () => {
    expect(classifyAuthActionError({ code: 'auth/expired-action-code' })).toBe('expired')
    expect(classifyAuthActionError({ code: 'auth/invalid-action-code' })).toBe('expired')
    expect(classifyAuthActionError({ code: 'auth/weak-password' })).toBe('weak-password')
    expect(classifyAuthActionError({ code: 'auth/network-request-failed' })).toBe('network')
    expect(classifyAuthActionError({ code: 'auth/invalid-api-key' })).toBe('generic')
  })
})

describe('emailFromActionCodeInfo', () => {
  it('prefers the address being restored', () => {
    expect(
      emailFromActionCodeInfo({
        data: { previousEmail: 'old@example.com', email: 'new@example.com' },
      }),
    ).toBe('old@example.com')
    expect(emailFromActionCodeInfo({ data: { email: 'player@example.com' } })).toBe(
      'player@example.com',
    )
    expect(emailFromActionCodeInfo({})).toBe('')
  })
})
