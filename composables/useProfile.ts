import { User, onAuthStateChanged, getAuth } from "firebase/auth";
import { DocumentData, doc, getDoc, setDoc } from "firebase/firestore";
import { getFirestore } from "firebase/firestore";
import { useStorage } from "@vueuse/core";

interface UserProfile {
	uid: string;
	avatar: string;
	username: string;
	record: {
        coins: number;
		win: number;
		draw: number;
		loss: number;
	};
	lastPlayed?: {
		date?: Date;
		result?: string;
	};
	settings?: Record<string, any>;
	flags?: Record<string, any>;
	isGuest?: boolean;
}

const avatars = [
	"/avatars/origami-crane.webp",
	"/avatars/origami-warbler.webp",
	"/avatars/origami-curtain.webp",
	"/avatars/origami-butterfly.webp",
	"/avatars/origami-boar.webp",
	"/avatars/origami-deer.webp",
	"/avatars/origami-rainman.webp",
	"/avatars/origami-phoenix.webp",
];

const useUserProfile = (): Ref<UserProfile | null> =>
	useState("profile", () => null);

const useGuestProfile = (profile?: UserProfile | Partial<UserProfile>) =>
	useStorage("hanafuda-guest", profile || {}, sessionStorage, {
		mergeDefaults: true,
	});

export const useProfile = () => {
	const profile = useUserProfile();
	/**
	 * Retrieve data from Firestore
	 */
	const getUserData = async (user: User) => {
		const docRef = await getDoc(doc(getFirestore(), "users", `u_${user.uid}`));
		return docRef.exists() ? docRef.data() : null;
	};

	/**
	 * Save new data to Firestore
	 */
	const setUserData = () => {
		if (!profile.value) return;
		setDoc(
			doc(getFirestore(), "users", `u_${profile.value.uid}`),
			profile.value,
			{
				merge: true,
			}
		);
	};

	/**
	 * Load data from Firestore if available, sessionStorage if guest, or create a new profile
	 */
	const loadProfile = async (user: User) => {
		const userData = await getUserData(user);
		if (userData) {
			loadUserData(user, userData);
		} else if (user.isAnonymous) {
			loadGuestData(user);
		} else {
			createNewProfile(user);
		}
	};

	const loadUserData = (user: User, userData: DocumentData) => {
		profile.value = {
			uid: user.uid,
			avatar: userData.avatar || user.photoURL || getRandom(avatars),
			username:
				userData.username ||
				user.displayName?.split(" ")[0] ||
				`User_${user.uid.slice(0, 5)}`,
			lastPlayed: {
				date: userData.lastPlayed.date.toDate(),
				result: userData.lastPlayed.result,
			},
			record: userData.record || { coins: 0, win: 0, draw: 0, loss: 0 },
			settings: userData.settings,
			flags: userData.flags || {
				isNewPlayer: true,
				hasSubmittedFeedback: false,
			},
		};
	};

	const loadGuestData = (user: User) => {
		const guest = useGuestProfile({
			uid: user.uid,
			avatar: user.photoURL || getRandom(avatars),
			username:
				user.displayName?.split(" ")[0] || `Guest_${user.uid.slice(0, 5)}`,
			record: { coins: 0, win: 0, draw: 0, loss: 0 },
			isGuest: true,
		});
		profile.value = guest.value as UserProfile;
	};

	const createNewProfile = (user: User) => {
		profile.value = {
			uid: user.uid,
			avatar: user.photoURL || getRandom(avatars),
			username:
				user.displayName?.split(" ")[0] || `User #${user.uid.slice(0, 5)}`,
			record: { coins: 0, win: 0, draw: 0, loss: 0 },
			flags: {
				isNewPlayer: true,
				hasSubmittedFeedback: false,
			},
		};
		setUserData();
	};

	const getProfile = async (user: User) => {
		if (profile.value) return profile.value;
		await loadProfile(user);
		return profile.value;
	};

	const current = computed(() => profile.value);

	const updateProfile = () => {
		if (!profile.value) return;
		const data: Partial<UserProfile> = {
			avatar: profile.value.avatar,
			username: profile.value.username,
			settings: profile.value.settings,
			lastPlayed: profile.value.lastPlayed,
            record: profile.value.record,
			flags: profile.value.flags,
		};
		if (!profile.value.isGuest) {
			setDoc(doc(getFirestore(), "users", `u_${profile.value.uid}`), data, {
				merge: true,
			});
		} else {
			const guest = useGuestProfile();
			for (const key in data) {
                // @ts-ignore
				guest.value[key as keyof Partial<UserProfile>] = data[key];
			}
		}
	};

	const unwatch = watch(
		profile,
		() => {
			if (!profile.value) unwatch();
			updateProfile();
		},
		{ deep: true }
	);

	onAuthStateChanged(getAuth(), () => {
		if (getAuth().currentUser === null) {
			profile.value = null;
			sessionStorage?.removeItem("hanafuda-guest");
		}
	});

	return {
		current,
		getProfile,
		updateProfile,
	};
};
