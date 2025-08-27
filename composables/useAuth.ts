import { useStorage } from '@vueuse/core'
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  GithubAuthProvider,
  GoogleAuthProvider,
  linkWithCredential,
  linkWithPopup,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type UserCredential,
} from 'firebase/auth'
import { useI18n } from 'vue-i18n'
import { useToast } from 'vue-toastification'

export const useAuth = () => {
  const PROVIDERS = {
    google: GoogleAuthProvider,
    github: GithubAuthProvider,
  } as const

  type OAuthProviders = keyof typeof PROVIDERS

  const auth = useFirebaseAuth()!
  const error = ref()
  const toast = useToast()
  const { t } = useI18n()
  const { $clientPosthog } = useNuxtApp()

  const useGuest = () =>
    useStorage('hanafuda-guest', {} as Record<string, any>, sessionStorage, { mergeDefaults: true })

  const userIsGuest = computed(() => auth.currentUser?.isAnonymous)

  const signUpWithEmail = async (email: string, password: string) => {
    try {
      const guest = useGuest().value
      const { user } = await createUserWithEmailAndPassword(auth, email, password)
      if (!user) return false
      useGuest().value = {}
      $clientPosthog?.capture('sign_up', { method: 'email' })
      return true
    } catch (err) {
      toast.error(`${t('auth.messages.unableToCreateAccount')} ${(err as Error).message}`, {
        timeout: 8000,
      })
      error.value = err
      return false
    }
  }

  const loginWithEmail = async (email: string, password: string) => {
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password)
      if (!user) return false
      useGuest().value = {}
      $clientPosthog?.capture('login', { method: 'email' })
      return true
    } catch (err) {
      toast.error(t('auth.messages.invalidEmailOrPassword'), {
        timeout: 8000,
      })
      error.value = err
      return false
    }
  }

  const linkWithEmail = async (email: string, password: string) => {
    const user = auth.currentUser
    if (!user) return false
    try {
      const { user: linkedUser } = await linkWithCredential(
        user,
        EmailAuthProvider.credential(email, password),
      )
      if (!linkedUser) return false
      useGuest().value = {}
      $clientPosthog?.capture('link_account', { method: 'email' })
      return true
    } catch (err) {
      toast.error(`${t('auth.messages.unableToLinkAccount')} ${(err as Error).message}`, {
        timeout: 8000,
      })
      error.value = err
      return false
    }
  }

  const loginWithOAuth = async (providerName: OAuthProviders) => {
    const provider = new PROVIDERS[providerName]()
    try {
      const result = await signInWithPopup(auth, provider)
      if (!result) return false
      return handleOAuth(result)
    } catch (err) {
      toast.error(t('auth.messages.unableToSignIn'))
      error.value = err
      $clientPosthog?.capture('login_failed', { method: providerName })
    }
    return false
  }

  const loginAsGuest = async (username?: string) => {
    const { user } = await signInAnonymously(auth)
    const guest = {
      uid: user.uid,
      username: username,
    }
    useGuest().value = guest
    $clientPosthog?.capture('login', { method: 'anonymous' })
    return user
  }

  const logout = () => {
    if (auth.currentUser?.isAnonymous) {
      useGuest().value = {}
      auth.currentUser.delete()
    } else {
      signOut(auth)
      toast.info(t('auth.messages.youHaveBeenSignedOut'))
    }
    $clientPosthog?.reset()
  }

  const linkAccount = async (providerName: OAuthProviders) => {
    const user = auth.currentUser
    if (!user) return false
    const provider = PROVIDERS[providerName]
    try {
      const result = await linkWithPopup(user, new provider())
      $clientPosthog?.capture('link_account', { method: providerName })
      return handleOAuth(result)
    } catch (err) {
      toast.error(`${t('auth.messages.unableToLinkAccount')} ${(err as Error).message}`, {
        timeout: 8000,
      })
      error.value = err
      return false
    }
  }

  const handleOAuth = async (result: UserCredential) => {
    try {
      const googleCredential = GoogleAuthProvider.credentialFromResult(result)
      const githubCredential = GithubAuthProvider.credentialFromResult(result)
      const credential = googleCredential || githubCredential || null

      if (credential) {
        useGuest().value = {}
        $clientPosthog?.capture('login', { method: credential.signInMethod })
        return true
      }
    } catch (err) {
      toast.error(t('auth.messages.unableToSignIn'))
      error.value = err
    }
    return false
  }

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email)
      toast.success(t('auth.messages.passwordResetSent', { email }))
      return true
    } catch (err) {
      toast.error(t('auth.messages.unableToSendPasswordReset'), {
        timeout: 8000,
      })
      console.error(err)
      error.value = err
      return false
    }
  }

  return {
    signUpWithEmail,
    loginWithEmail,
    loginWithOAuth,
    loginAsGuest,
    logout,
    linkAccount,
    linkWithEmail,
    error,
    useGuest,
    userIsGuest,
    resetPassword,
  }
}
