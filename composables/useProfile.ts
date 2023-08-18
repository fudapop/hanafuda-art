import { User, onAuthStateChanged, getAuth } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getFirestore } from "firebase/firestore";

interface UserProfile {
    uid: string;
    avatar: string;
    username: string;
    lastPlayed?: {
        date?: Date,
        result?: string,
    }
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

const useUserProfile = (): Ref<UserProfile | null> => useState("profile", () => null);

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
     * Save data to Firestore
     */
	const setUserData = async (user: User) => {
		if (!profile.value) return;
		if (profile.value.uid !== user.uid) return;
		await setDoc(doc(getFirestore(), "users", `u_${user.uid}`), profile.value, {
			merge: true,
		});
	};

    /**
     * Load data from Firestore if available or create a new profile
     */
	const loadProfile = async (user: User) => {
		const userData = await getUserData(user);
		if (userData) {
			// profile.value = userData as UserProfile;
            profile.value = {
             uid: user.uid,
             avatar: userData.avatar || user.photoURL || getRandom(avatars),
             username: userData.username || user.displayName?.split(" ")[0] || `User #${user.uid.slice(0,5)}`,
             lastPlayed: { date: userData.lastPlayed.date.toDate(), result: userData.lastPlayed.result },
             settings: userData.settings,
             flags: userData.flags || {
                isNewPlayer: true,
                hasSubmittedFeedback: false,
            },
            }
            // setUserData(user);
		} else {
            profile.value = {
                uid: user.uid,
                avatar: user.photoURL || getRandom(avatars),
                username: user.displayName?.split(" ")[0] || `User #${user.uid.slice(0,5)}`,
                flags: {
                    isNewPlayer: true,
                    hasSubmittedFeedback: false,
                }
			};
            if (user.isAnonymous) {
                profile.value.isGuest = true;
            } else {
                setUserData(user)
            };
		}
	};

	const getProfile = async (user: User) => {
		if (profile.value) return profile.value;
		await loadProfile(user);
		return profile.value;
	};

    const current = computed(() => profile.value);

    const updateProfile = () => {
        if (!profile.value || profile.value.isGuest) return;
        setDoc(doc(getFirestore(), "users", `u_${profile.value.uid}`), {
            avatar: profile.value.avatar,
            username: profile.value.username,
            settings: profile.value.settings,
            flags: profile.value.flags,
        }, {
            merge: true,
        });
    }

    const unwatch = watch(profile, () => {
        if (!profile.value) unwatch();
        updateProfile();
    }, { deep: true })

    onAuthStateChanged(getAuth(), () => {if (getAuth().currentUser === null) profile.value = null});

    return {
        current,
        getProfile,
        updateProfile,
    }
};
