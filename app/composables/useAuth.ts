import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  GithubAuthProvider,
  GoogleAuthProvider,
  sendPasswordResetEmail,
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

  const signUpWithEmail = async (email: string, password: string) => {
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password)
      if (!user) return false
      // Guest profile transfer handled by useProfile auth watcher
      $clientPosthog?.capture('sign_up', { method: 'email' })
      return true
    } catch (err) {
      toast.error(`${t('auth.messages.unableToCreateAccount')}\n${(err as Error).message}`, {
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
      // Guest profile transfer handled by useProfile auth watcher
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

  const logout = async () => {
    try {
      // Clear profile state using useProfile's resetLocal
      const { resetLocal } = useProfile()
      await resetLocal()

      // Handle Firebase logout
      if (auth.currentUser) {
        await signOut(auth)
        toast.info(t('auth.messages.youHaveBeenSignedOut'))
      }

      $clientPosthog?.reset()
    } catch (error) {
      console.error('Logout error:', error)
      // Even if logout fails, we should still reset PostHog
      $clientPosthog?.reset()
      // Show user feedback
      toast.error(t('auth.messages.logoutError') || 'Failed to sign out')
    }
  }

  const handleOAuth = async (result: UserCredential) => {
    try {
      const googleCredential = GoogleAuthProvider.credentialFromResult(result)
      const githubCredential = GithubAuthProvider.credentialFromResult(result)
      const credential = googleCredential || githubCredential || null

      if (credential) {
        // Guest profile transfer handled by useProfile auth watcher
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
    logout,
    error,
    resetPassword,
  }
}
