import { tryOnMounted, useStorage } from "@vueuse/core";
import { CardName, DECK } from "~/utils/cards";
import { ref as storageRef } from "firebase/storage";
import { useFirebaseStorage, useStorageFileUrl } from "vuefire";

const DESIGNS = [
	"cherry-version",
	"sabling-art",
	"koinobori",
    "hanami",
    "modern",
    "moon-rabbit",
    "nishiki-fuda",
    "ramen-red",
	"flash-black",
] as const;

type CardDesign = (typeof DESIGNS)[number];

const getImage = (designPath: string) => {
	const storage = useFirebaseStorage();
	const imageFileRef = storageRef(storage, designPath);
	const {
		url,
		// refresh the url if the file changes
		refresh,
	} = useStorageFileUrl(imageFileRef);
	return { url };
};

const checkStorage = (cardDesign: CardDesign) => {
	const data = localStorage?.getItem(cardDesign);
	if (data) {
		return JSON.parse(data);
	}
};

// const preFetchFromStorage()

const getCardMap = async (cardDesign: CardDesign) => {
	const storedMap = checkStorage(cardDesign);
	if (storedMap) {
		console.log({ storedMap });
		return new Map([...Object.entries(storedMap)]) as Map<CardName, string>;
	}

	const cards = [...DECK];
	const urlRefs = cards.map((cardName) =>
		getImage(`cards/${cardDesign}/${cardName}.webp`)
	);
	while (urlRefs.some((card) => !card.url.value)) {
		console.log("Fetching...");
		await sleep();
	}

	const urlMap: Map<CardName, string> = new Map();
	// cards.forEach((cardName, index) => urlMap.set(cardName, urlRefs[index].url.value as string))
	useStorage(
		cardDesign,
		Object.fromEntries(
			urlRefs.map((ref, index) => {
				const [card, url] = [cards[index], ref.url.value];
				urlMap.set(card, url as string);
				return [card, url];
			})
		),
		localStorage
	);
	// [...urlMap.values()].forEach((url) => {
	// 	console.log(url);
	// });
	return urlMap;
};

const cardMap: Ref<Map<CardName, string> | undefined> = ref();

export const useCardDesign = () => {
	const useDesign = (): Ref<CardDesign> =>
		useState("design", () => "cherry-version");
	const useDesignPath = computed(
		() => (cardName: CardName) =>
			`cards/${useDesign().value}/${cardName}.webp`
	);
	const getCardUrl = (cardName: CardName) => {
		const url = cardMap.value?.get(cardName);
		return url;
	};

	const fetchCardUrls = async () => {
		cardMap.value = await getCardMap(useDesign().value);
		return cardMap.value;
	};

	tryOnMounted(() => {
		document?.body.classList.add(useDesign().value);
	});

	return {
		fetchCardUrls,
		useDesign,
		useDesignPath,
		getCardUrl,
        DESIGNS,
	};
};
