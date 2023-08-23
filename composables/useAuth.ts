import {
	signInAnonymously,
	linkWithRedirect,
	signInWithRedirect,
	GoogleAuthProvider,
	GithubAuthProvider,
  // FacebookAuthProvider,
	signOut,
	getRedirectResult,
} from "firebase/auth";
import { useStorage } from "@vueuse/core";
import { useToast } from "vue-toastification";

export const useAuth = () => {
	const PROVIDERS = {
		google: GoogleAuthProvider,
		github: GithubAuthProvider,
		// facebook: FacebookAuthProvider,
	} as const;

	type OAuthProviders = keyof typeof PROVIDERS;

	const auth = useFirebaseAuth()!;
	const error = ref();
  const toast = useToast();

	const useGuest = () =>
		useStorage(
			"hanafuda-guest",
			(): Record<string, any> | undefined => undefined,
			localStorage
		);

	const loginWithOAuth = (providerName: OAuthProviders) => {
		const provider = new PROVIDERS[providerName]();
		signInWithRedirect(auth, provider);
	};

	const loginAsGuest = async () => {
		const { user } = await signInAnonymously(auth);
		const guest = {
			uid: user.uid,
		};
		useGuest().value = guest;
		return guest;
	};

	const logout = () => {
		if (auth.currentUser?.isAnonymous) {
			auth.currentUser.delete();
		} else {
			signOut(auth);
		}
	};

	const linkAccount = (providerName: OAuthProviders) => {
		const user = auth.currentUser;
		if (!user) return;
		const provider = PROVIDERS[providerName];
		linkWithRedirect(user, new provider());
	};

	onMounted(async () => {
		try {
			const result = await getRedirectResult(auth);
			if (result) {
				const googleCredential = GoogleAuthProvider.credentialFromResult(result);
				const githubCredential = GithubAuthProvider.credentialFromResult(result);
				// const facebookCredential = FacebookAuthProvider.credentialFromResult(result);
        const credential = googleCredential || githubCredential || null;

        if (credential) {
          toast.success("You're signed in!", { timeout: 1000 });
        }
				
			}
		} catch (err) {
			toast.error("Unable to sign in. Please try again later.");
			error.value = err;
		}
	});

	return {
		loginWithOAuth,
		loginAsGuest,
		logout,
    linkAccount,
		error,
		useGuest,
	};
};
