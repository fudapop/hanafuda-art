import { type User, onAuthStateChanged, getAuth } from "firebase/auth";
import {
	type DocumentData,
	doc,
	getDoc,
	setDoc,
	getFirestore,
} from "firebase/firestore";
import { useStorage } from "@vueuse/core";
import { type CardDesign } from "~/composables/useCardDesign";

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
	lastUpdated: Date;
	designs: {
		unlocked: CardDesign[];
		liked: CardDesign[];
	};
	settings: Record<string, any> | null;
	flags: Record<string, any>;
	isGuest?: boolean;
}

const avatars = [
	// "/avatars/flat-crane.webp",
	// "/avatars/flat-warbler.webp",
	// "/avatars/flat-curtain.webp",
	// "/avatars/flat-bridge.webp",
	// "/avatars/flat-butterflies.webp",
	// "/avatars/flat-boar.webp",
	// "/avatars/flat-moon.webp",
	// "/avatars/flat-deer.webp",
	// "/avatars/flat-phoenix.webp",
	"/avatars/origami-crane.webp",
	"/avatars/origami-warbler.webp",
	"/avatars/origami-curtain.webp",
	"/avatars/origami-cuckoo.webp",
	"/avatars/origami-bridge.webp",
	"/avatars/origami-butterflies.webp",
	"/avatars/origami-boar.webp",
	"/avatars/origami-moon.webp",
	"/avatars/origami-deer.webp",
	"/avatars/origami-rainman.webp",
	"/avatars/origami-phoenix.webp",
];

const defaultDesigns: CardDesign[] = [
	"cherry-version",
	"ramen-red",
	"flash-black",
];

const watcher = ref();

export const useProfile = () => {
	const useUserProfile = (): Ref<UserProfile | null> =>
		useState("profile", () => null);

	const useGuestProfile = (profile?: UserProfile | Partial<UserProfile>) =>
		useStorage("hanafuda-guest", profile?.isGuest ? profile : {}, sessionStorage, {
			mergeDefaults: true,
		});

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
			lastUpdated: userData.lastUpdated?.toDate() || new Date(),
			record: userData.record || { coins: 500, win: 0, draw: 0, loss: 0 },
			designs: userData.designs || { unlocked: [...defaultDesigns], liked: [] },
			settings: userData.settings || null,
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
				user.displayName?.split(" ")[0] || `User #${user.uid.slice(0, 5)}`,
			lastUpdated: new Date(),
			record: { coins: 0, win: 0, draw: 0, loss: 0 },
			designs: { unlocked: [...defaultDesigns], liked: [] },
			flags: {
				isNewPlayer: true,
				hasSubmittedFeedback: false,
			},
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
			lastUpdated: new Date(),
			record: { coins: 500, win: 0, draw: 0, loss: 0 },
			designs: { unlocked: [...defaultDesigns], liked: [] },
			settings: null,
			flags: {
				isNewPlayer: true,
				hasSubmittedFeedback: false,
			},
		};
		setUserData();
	};

	const upgradeGuestProfile = (guestProfile: UserProfile) => {
		delete guestProfile.isGuest;
		profile.value = guestProfile;
		profile.value.lastUpdated = new Date();
		profile.value.record.coins += 500;
		setUserData();
		console.debug("Upgraded guest profile.")
		deleteGuestProfile();
	};

	const deleteGuestProfile = () => {
		useGuestProfile().value = {};
	}

	const getProfile = async (user: User) => {
		if (profile.value) return profile.value;
		await loadProfile(user);
		return profile.value;
	};

	const updateProfile = () => {
		if (!profile.value) return;
		const data: Partial<UserProfile> = {
			avatar: profile.value.avatar,
			username: profile.value.username,
			settings: profile.value.settings,
			record: profile.value.record,
			flags: profile.value.flags,
			designs: profile.value.designs,
			lastUpdated: new Date(),
		};
		if (!profile.value.isGuest) {
			setDoc(doc(getFirestore(), "users", `u_${profile.value.uid}`), data, {
				merge: true,
			});
		} else {
			const guest = useGuestProfile();
			console.log("Updating guest profile...");
			for (const key in data) {
				// @ts-ignore
				guest.value[key as keyof Partial<UserProfile>] = data[key];
			}
		}
	};

	const current = computed(() => profile.value);

	if (!watcher.value) {
		console.debug("Setting profile watcher...");
		watcher.value = watch(
			profile,
			() => {
				if (!profile.value) {
					watcher.value();
					console.debug("Cleared profile watcher.");
				}
				updateProfile();
			},
			{ deep: true }
		);

		console.debug("Setting auth watcher...");
		onAuthStateChanged(getAuth(), () => {
			if (getAuth().currentUser === null) {
				profile.value = null;
				deleteGuestProfile();
			}
		});
	}

	return {
		current,
		getProfile,
		updateProfile,
		upgradeGuestProfile,
	};
};
