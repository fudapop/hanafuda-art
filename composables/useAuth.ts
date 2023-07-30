import {
  signInWithRedirect,
  GoogleAuthProvider,
  getAuth,
  signOut,
  getRedirectResult,
} from "firebase/auth";
import { useCurrentUser, getCurrentUser } from "vuefire";
import { useStorage } from "@vueuse/core";

export const useAuth = () => {
  const auth = getAuth();
  const provider = new GoogleAuthProvider();
  const token = ref();
  const error = ref();

  const login = () => {
    signInWithRedirect(auth, provider);
  };

  const logout = () => {
    signOut(auth);
  };

  onMounted(async () => {
    try {
        const result = await getRedirectResult(auth);
        if (result) {
          // This is the signed-in user
        //   const user = result.user;
          // This gives you a Facebook Access Token.
          const credential = GoogleAuthProvider.credentialFromResult(result);
          token.value = useStorage(
            "hanafuda-auth",
            { token: credential?.accessToken },
            localStorage
          );
        }
    } catch (err) {
        console.error(err);
        error.value = err;
    }
  });

  return {
    login,
    logout,
    error,
    token,
  };
};
