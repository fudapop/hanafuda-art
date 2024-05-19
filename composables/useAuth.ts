import {
	signInAnonymously,
	signInWithEmailAndPassword,
	EmailAuthProvider,
	GoogleAuthProvider,
	GithubAuthProvider,
  // FacebookAuthProvider,
	signOut,
	signInWithPopup,
	linkWithPopup,
	type UserCredential,
	linkWithCredential,
	createUserWithEmailAndPassword,
	sendPasswordResetEmail,
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
	const { log } = useAnalytics();

	const useGuest = () =>
		useStorage(
			"hanafuda-guest",
			{} as Record<string, any>,
			sessionStorage
		);

	const userIsGuest = computed(() => auth.currentUser?.isAnonymous);

	const signUpWithEmail = async (email: string, password: string) => {
		try {
			const guest = useGuest().value;
			const { user } = await createUserWithEmailAndPassword(auth, email, password);
			if (!user) return false;
			if (guest?.uid) {
				log("sign_up", { method: "email" });
			} else {
				log("login", { method: "email" });
			}
			useGuest().value = {};
			return true;
		} catch (err) {
			toast.error("Unable to create an account. " + (err as Error).message, {
				timeout: 8000,
			});
			error.value = err;
			return false;
		}
	}

	const loginWithEmail = async (email: string, password: string) => {
		try {
			const { user } = await signInWithEmailAndPassword(auth, email, password);
			if (!user) return false;
			log("login", { method: "email" });
			useGuest().value = {};
			return true;
		} catch (err) {
			toast.error("Invalid email or password. Please try again.", {
				timeout: 8000,
			});
			error.value = err;
			return false;
		}
	}

	const linkWithEmail = async (email: string, password: string) => {
		const user = auth.currentUser;
		if (!user) return false;
		try {
			const { user: linkedUser } = await linkWithCredential(user, EmailAuthProvider.credential(email, password));
			if (!linkedUser) return false;
			useGuest().value = {};
			return true;
		} catch (err) {
			toast.error("Unable to link your account. " + (err as Error).message, {
				timeout: 8000,
			});
			error.value = err;
			return false;
		}
	}

	const loginWithOAuth = async (providerName: OAuthProviders) => {
		const provider = new PROVIDERS[providerName]();
		try {
			const result = await signInWithPopup(auth, provider);
			if (!result) return false;
			return handleOAuth(result);
		} catch (err) {
			toast.error("Unable to sign in. Please try again later.");
			error.value = err;
		};
		return false;
	};

	const loginAsGuest = async () => {
		const { user } = await signInAnonymously(auth);
		const guest = {
			uid: user.uid,
		};
		useGuest().value = guest;
    log("login", { method: "anonymous" });
		return guest;
	};

	const logout = () => {
		if (auth.currentUser?.isAnonymous) {
			useGuest().value = {};
			auth.currentUser.delete();
		} else {
			signOut(auth);
			toast.info("You have been signed out.");
		}
	};

	const linkAccount = async (providerName: OAuthProviders) => {
		const user = auth.currentUser;
		if (!user) return false;
		const provider = PROVIDERS[providerName];
		try {
			const result = await linkWithPopup(user, new provider());
			return handleOAuth(result);
		} catch (err) {
			toast.error("Unable to link your account. " + (err as Error).message, {
				timeout: 8000,
			});
			error.value = err;
			return false;
		};
	};
	
	const handleOAuth = async (result: UserCredential) => {
		try {
			const googleCredential = GoogleAuthProvider.credentialFromResult(result);
			const githubCredential = GithubAuthProvider.credentialFromResult(result);
			// const facebookCredential = FacebookAuthProvider.credentialFromResult(result);
			const credential = googleCredential || githubCredential || null;
			
			if (credential) {
				if (useGuest().value?.uid) {
					log("sign_up", { method: credential.signInMethod });
				} else {
					log("login", { method: credential.signInMethod });
				}
				useGuest().value = {};
				return true;
			}
		} catch (err) {
			toast.error("Unable to sign in. Please try again later.");
			error.value = err;
		}
		return false;
	};

	const resetPassword = async (email: string) => {
		try {
			await sendPasswordResetEmail(auth, email);
			toast.success(`Password reset email has been sent to ${email}.`);
			return true;
		} catch (err) {
			toast.error("Unable to send password reset email.", {
				timeout: 8000,
			});
			console.error(err);
			error.value = err;
			return false;
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
	};
};
