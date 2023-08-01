import {
  signInAnonymously,
  signInWithCredential,
  signInWithRedirect,
  GoogleAuthProvider,
  GithubAuthProvider,
  signOut,
  getRedirectResult,
  UserCredential,
} from "firebase/auth";
import { useStorage } from "@vueuse/core";

const PROVIDERS = {
  google: () => new GoogleAuthProvider(),
  github: () => new GithubAuthProvider(),
} as const;

type OAuthProviders = keyof typeof PROVIDERS;

const useGuest = () =>
  useStorage(
    "hanafuda-guest",
    (): string | undefined => undefined,
    localStorage
  );

const useToken = () =>
  useStorage(
    "hanafuda-token",
    (): string | undefined => undefined,
    localStorage
  );

export const useAuth = () => {
  const auth = useFirebaseAuth()!;
  const error = ref();

  const loginWithOAuth = (providerName: OAuthProviders) => {
    const provider = PROVIDERS[providerName]();
    signInWithRedirect(auth, provider);
  };

  const loginAsGuest = async () => {
    const { user } = await signInAnonymously(auth);
    const idToken = await user.getIdToken();
    const guest = {
      uid: user.uid,
      idToken,
    };
    useGuest().value = JSON.stringify(guest);
    useToken().value = JSON.stringify(guest);
  };

  const logout = () => {
    signOut(auth);
  };

  onMounted(async () => {
    try {
      const result = await getRedirectResult(auth);
      if (result) {
        // This is the signed-in user
        const user = result.user;
        // This gives you a Facebook Access Token.
        const credential = GoogleAuthProvider.credentialFromResult(result);
        useToken().value = JSON.stringify({
          uid: user.uid,
          accessToken: credential?.accessToken,
        });
      }
    } catch (err) {
      console.error(err);
      error.value = err;
    }
  });

  return {
    loginWithOAuth,
    loginAsGuest,
    logout,
    error,
    useGuest,
    useToken,
  };
};
