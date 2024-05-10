import { useStorage } from "@vueuse/core";
import { CardName, DECK } from "~/utils/cards";
import { getDownloadURL, getStorage, ref as storageRef, updateMetadata } from "firebase/storage";
import CARD_DESIGNS from "~/assets/designInfo.json";

export type DesignInfo = {
	name: string;
	title: string;
	creator?: string;
	releaseDate?: string | Date;
	description?: string;
	urlDescription?: string;
	url?: string;
	contributor?: string;
	contributorUrl?: string;
	backImage?: boolean;
	arrangement?: {
		reversed?: boolean;
		orderByName?: string[];
	};
};

export type CardDesign = keyof typeof CARD_DESIGNS;

const DESIGNS = Object.keys(CARD_DESIGNS) as CardDesign[];

type CardMap = Map<CardName, string>;

const CARD_MAP: Ref<CardMap | undefined> = ref();

export const useCardDesign = () => {
	const getImage = async (designPath: string) => {
		const storage = getStorage();
		const imageFileRef = storageRef(storage, designPath);
		const newMetadata = {
			contentType: "image/webp",
			cacheControl: "public, max-age=31536000",
		};
		updateMetadata(imageFileRef, newMetadata).catch((error) => {
			console.error({ error });
		});
		const url = await getDownloadURL(imageFileRef);
		return url;
	};

	const getFromSession = (cardDesign: CardDesign) => {
		try {
		const map = localStorage.getItem("new-hanafuda");
		if (!map) return null;
			const store = JSON.parse(map);
			if (!store[cardDesign]) return null;
			const urlMap = new Map(Object.entries(store[cardDesign])) as CardMap;
			return urlMap;
		} catch (e) {
			console.error(e);
			return null;
		}
	}

	const saveToSession = (cardDesign: CardDesign, urlMap: CardMap) => {
		useStorage(
			"new-hanafuda", 
			{
				[cardDesign]: Object.fromEntries([...urlMap.entries()]), 
			},
			localStorage, 
			{ mergeDefaults: true }
		);
	}
	
	/**
	 * Asynchronously fetches the URLs for all cards in the specified design.
	 * If the design has been fetched before, the URLs are retrieved from the cache.
	 * 
	 * @param cardDesign Design to get card URLs for.
	 * @returns Map of card names to URLs for the specified design.
	 */
	const getCardMap = async (cardDesign: CardDesign) => {
		// Check if the URLs are already in the cache
		let urlMap: CardMap = getFromSession(cardDesign) as any;
		if (urlMap) return urlMap;
	
		// Check if the URLs are in Firestore
		// urlMap = await getFromStore(cardDesign) as any;
		// if (urlMap) {
		// 	saveToSession(cardDesign, urlMap);
		// 	return urlMap;
		// }
	
		// Fetch the URLs from storage
		urlMap = new Map();
		const urls = await Promise.all(DECK.map(async (cardName) =>
			await getImage(`cards/${cardDesign}/${cardName}.webp`)
		));
		urls.forEach((url, index) => {
			urlMap.set(DECK[index], url);
		});
	
		// Save the URLs to Firestore and cache
		// saveToStore(cardDesign, urlMap);
		saveToSession(cardDesign, urlMap);
		return urlMap;
	};

	const useDesign = (): Ref<CardDesign> =>
		useState("design", () => "cherry-version");
		
	const useDesignPath = computed(
		() => (cardName: CardName) => `cards/${useDesign().value}/${cardName}.webp`
	);
	const getCardUrl = (cardName: CardName) => {
		const url = CARD_MAP.value?.get(cardName);
		return url;
	};

	/**
	 * 
	 * @param designName (optional) Name of design to get info for. Defaults to current design.
	 * @returns Info for the current design or the design specified. 
	 * See link for more: {@link DesignInfo}
	 * 
	 */
	const getDesignInfo = (designName?: CardDesign) => CARD_DESIGNS[designName ?? useDesign().value] as DesignInfo;

	const fetchCardUrls = async () => {
		CARD_MAP.value = await getCardMap(useDesign().value);
		return CARD_MAP.value;
	};

	return {
		fetchCardUrls,
		useDesign,
		useDesignPath,
		getCardUrl,
		getDesignInfo,
		DESIGNS,
	};
};
