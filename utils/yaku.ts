import { CardName } from "./cards";

const YAKU_NAMES = [
	"gokou",
	"shikou",
	"ame-shikou",
	"sankou",
	"hanami-zake",
	"tsukimi-zake",
	"ino-shika-chou",
	"aka-tan",
	"ao-tan",
	"tan-zaku",
	"tane-zaku",
	"kasu",
	"kuttsuki",
	"teshi",
] as const;

type YakuName = (typeof YAKU_NAMES)[number];

type Yaku = {
	name: YakuName;
	description: string[];
	points: number;
	cards: CardName[];
	numRequired: number;
	find: (params: Set<CardName>) => CardName[];
	check: (params: Set<CardName>) => number;
};

const YAKU: Readonly<Record<YakuName, Yaku>> = {
	gokou: {
		name: "gokou",
		points: 15,
		description: ["Five Brights"],
		cards: [
			"matsu-ni-tsuru",
			"sakura-ni-maku",
			"susuki-ni-tsuki",
			"kiri-ni-ho-oh",
			"yanagi-ni-ono-no-toufuu",
		],
		numRequired: 5,
		find: function (collection) {
			return getIntersection(collection, this.cards);
		},
		check: function (collection) {
			if (collection.size < this.numRequired) return 0;

			const progress = this.find(collection);
			if (progress.length < this.numRequired) return 0;

			return this.points;
		},
	},
	shikou: {
		name: "shikou",
		points: 8,
		description: ["Four Brights"],
		cards: [
			"matsu-ni-tsuru",
			"sakura-ni-maku",
			"susuki-ni-tsuki",
			"kiri-ni-ho-oh",
		],
		numRequired: 4,
		find: function (collection) {
			return getIntersection(collection, this.cards);
		},
		check: function (collection) {
			if (collection.size < this.numRequired) return 0;
			if (collection.has("yanagi-ni-ono-no-toufuu")) return 0;

			const progress = this.find(collection);
			if (progress.length !== this.numRequired) return 0;

			return this.points;
		},
	},
	"ame-shikou": {
		name: "ame-shikou",
		points: 7,
		description: ["Rainy Four Brights ( Any 3 + Rain Man )"],
		cards: [
			"matsu-ni-tsuru",
			"sakura-ni-maku",
			"susuki-ni-tsuki",
			"kiri-ni-ho-oh",
			"yanagi-ni-ono-no-toufuu",
		],
		numRequired: 4,
		find: function (collection) {
			return getIntersection(collection, this.cards);
		},
		check: function (collection) {
			if (collection.size < this.numRequired) return 0;
			if (!collection.has("yanagi-ni-ono-no-toufuu")) return 0;

			const progress = this.find(collection);
			if (progress.length !== this.numRequired) return 0;

			return this.points;
		},
	},
	sankou: {
		name: "sankou",
		description: ["Three Brights ( Any 3 )"],
		points: 6,
		cards: [
			"matsu-ni-tsuru",
			"sakura-ni-maku",
			"susuki-ni-tsuki",
			"kiri-ni-ho-oh",
		],
		numRequired: 3,
		find: function (collection) {
			return getIntersection(collection, this.cards);
		},
		check: function (collection) {
			if (collection.size < this.numRequired) return 0;
			if (collection.has("yanagi-ni-ono-no-toufuu")) return 0;

			const progress = this.find(collection);
			if (progress.length !== this.numRequired) return 0;

			return this.points;
		},
	},
	"ino-shika-chou": {
		name: "ino-shika-chou",
		points: 5,
		description: ["Boar, Deer & Butterfly"],
		cards: ["hagi-ni-inoshishi", "momiji-ni-shika", "botan-ni-chou"],
		numRequired: 3,
		find: function (collection) {
			return getIntersection(collection, this.cards);
		},
		check: function (collection) {
			if (collection.size < this.numRequired) return 0;

			const progress = this.find(collection);
			if (progress.length < this.numRequired) return 0;

			return this.points;
		},
	},
	"hanami-zake": {
		name: "hanami-zake",
		points: 5,
		description: ["Flower Viewing"],
		cards: ["sakura-ni-maku", "kiku-ni-sakazuki"],
		numRequired: 2,
		find: function (collection) {
			return getIntersection(collection, this.cards);
		},
		check: function (collection) {
			if (collection.size < this.numRequired) return 0;

			const progress = this.find(collection);
			if (progress.length < this.numRequired) return 0;

			return this.points;
		},
	},
	"tsukimi-zake": {
		name: "tsukimi-zake",
		points: 5,
		description: ["Moon Viewing"],
		cards: ["susuki-ni-tsuki", "kiku-ni-sakazuki"],
		numRequired: 2,
		find: function (collection) {
			return getIntersection(collection, this.cards);
		},
		check: function (collection) {
			if (collection.size < this.numRequired) return 0;

			const progress = this.find(collection);
			if (progress.length < this.numRequired) return 0;

			return this.points;
		},
	},
	"aka-tan": {
		name: "aka-tan",
		points: 5,
		description: ["Red Poetry Ribbons"],
		cards: ["matsu-no-tan", "ume-no-tan", "sakura-no-tan"],
		numRequired: 3,
		find: function (collection) {
			return getIntersection(collection, this.cards);
		},
		check: function (collection) {
			if (collection.size < this.numRequired) return 0;

			const progress = this.find(collection);
			if (progress.length < this.numRequired) return 0;

			return this.points;
		},
	},
	"ao-tan": {
		name: "ao-tan",
		points: 5,
		description: ["Blue Ribbons"],
		cards: ["botan-no-tan", "kiku-no-tan", "momiji-no-tan"],
		numRequired: 3,
		find: function (collection) {
			return getIntersection(collection, this.cards);
		},
		check: function (collection) {
			if (collection.size < this.numRequired) return 0;

			const progress = this.find(collection);
			if (progress.length < this.numRequired) return 0;

			return this.points;
		},
	},
	"tan-zaku": {
		name: "tan-zaku",
		points: 1,
		description: ["Any 5 Ribbons ( + 1pt / extra )"],
		cards: [
			"matsu-no-tan",
			"ume-no-tan",
			"sakura-no-tan",
			"ayame-no-tan",
			"hagi-no-tan",
			"botan-no-tan",
			"fuji-no-tan",
			"kiku-no-tan",
			"momiji-no-tan",
			"yanagi-no-tan",
		],
		numRequired: 5,
		find: function (collection) {
			return getIntersection(collection, this.cards);
		},
		check: function (collection) {
			if (collection.size < this.numRequired) return 0;

			const progress = this.find(collection);
			if (progress.length < this.numRequired) return 0;

			return (
				this.points + getExtraPoints(this.numRequired, progress.length)
			);
		},
	},
	"tane-zaku": {
		name: "tane-zaku",
		points: 1,
		description: ["Any 5 Animals ( + 1pt / extra )"],
		cards: [
			"ume-ni-uguisu",
			"ayame-ni-yatsuhashi",
			"hagi-ni-inoshishi",
			"botan-ni-chou",
			"fuji-ni-kakku",
			"susuki-ni-kari",
			"kiku-ni-sakazuki",
			"momiji-ni-shika",
			"yanagi-ni-tsubame",
		],
		numRequired: 5,
		find: function (collection) {
			return getIntersection(collection, this.cards);
		},
		check: function (collection) {
			if (collection.size < this.numRequired) return 0;

			const progress = this.find(collection);
			if (progress.length < this.numRequired) return 0;

			return (
				this.points + getExtraPoints(this.numRequired, progress.length)
			);
		},
	},
	kasu: {
		name: "kasu",
		points: 1,
		description: ["Any 10 Plains ( + 1pt / extra )"],
		cards: [
			"matsu-no-kasu-1",
			"matsu-no-kasu-2",
			"ume-no-kasu-1",
			"ume-no-kasu-2",
			"sakura-no-kasu-1",
			"sakura-no-kasu-2",
			"ayame-no-kasu-1",
			"ayame-no-kasu-2",
			"hagi-no-kasu-1",
			"hagi-no-kasu-2",
			"botan-no-kasu-1",
			"botan-no-kasu-2",
			"fuji-no-kasu-1",
			"fuji-no-kasu-2",
			"susuki-no-kasu-1",
			"susuki-no-kasu-2",
			"kiku-no-kasu-1",
			"kiku-no-kasu-2",
			"momiji-no-kasu-1",
			"momiji-no-kasu-2",
			"yanagi-no-kasu",
			"kiri-no-kasu-1",
			"kiri-no-kasu-2",
			"kiri-no-kasu-3",
		],
		numRequired: 10,
		find: function (collection) {
			return getIntersection(collection, this.cards);
		},
		check: function (collection) {
			if (collection.size < this.numRequired) return 0;

			const progress = this.find(collection);
			if (progress.length < this.numRequired) return 0;

			return (
				this.points + getExtraPoints(this.numRequired, progress.length)
			);
		},
	},
	kuttsuki: {
		name: "kuttsuki",
		points: 6,
		description: ["4 pairs in hand"],
		cards: [],
		numRequired: 8,
		find: function (hand) {
			return [];
		},
		check: function (hand) {
			if (hand.size < this.numRequired) return 0;
			const [yaku, cards] = checkForKuttsukiOrTeshi([...hand]);
			if (yaku === this.name) {
				this.cards = cards;
				return this.points;
			}
			return 0;
		},
	},
	teshi: {
		name: "teshi",
		points: 6,
		description: ["4 of a kind in hand"],
		cards: [],
		numRequired: 8,
		find: function (hand) {
			return [];
		},
		check: function (hand) {
			if (hand.size < this.numRequired) return 0;
			const [yaku, cards] = checkForKuttsukiOrTeshi([...hand]);
			if (yaku === this.name) {
				this.cards = cards;
				return this.points;
			}
			return 0;
		},
	},
};

function getExtraPoints(numRequired: number, numCollected: number): number {
	const extraPoints = numCollected - numRequired;
	return extraPoints;
}

function getIntersection(collectedCards: Set<CardName>, yakuCards: CardName[]) {
	const hand = new Set(collectedCards);
	const collected = yakuCards.filter((card) => hand.has(card));
	return collected;
}

function checkAll(collection: Set<CardName>): {
	completed: YakuName[];
	score: number;
} {
	const completed: YakuName[] = [];
	const excluded = ["kuttsuki", "teshi"];
	const pointsArr = [...Object.values(YAKU)]
		.filter((yaku) => !excluded.includes(yaku.name))
		.map((yaku) => {
			const points = yaku.check(collection);
			if (points) completed.push(yaku.name);
			return points;
		});
	return {
		score: pointsArr.reduce((total, n) => total + n),
		completed,
	};
}

type CompletedYaku = {
	name: YakuName;
	cards: CardName[];
	points: number;
};

function getCompleted(
	collectedCards: Set<CardName>,
	completedYaku: YakuName[]
) {
	const report = [] as Array<CompletedYaku>;
	for (const yaku of completedYaku) {
		const yakuInfo = YAKU[yaku];
		report.push({
			name: yaku,
			cards: getIntersection(collectedCards, yakuInfo.cards),
			points: yakuInfo.check(collectedCards),
		});
	}
	return report;
}

function checkForWin(cards: Set<CardName>): CompletedYaku | null {
	const yaku = ["kuttsuki", "teshi"] as YakuName[];
	let completed = null;
	yaku.forEach((name) => {
		const points = YAKU[name].check(cards);
		if (points) {
			completed = {
				name,
				cards: YAKU[name].cards,
				points,
			};
		}
	});
	return completed;
}

function checkForKuttsukiOrTeshi(
	cardArr: CardName[]
): [YakuName | null, CardName[]] {
	// Check array for 4 of same suit/flower or 4 pairs
	// Returns name of found winning/voiding condition
	// Returns null if neither found
	let suitArr = cardArr.map((card) => CARDS[card].month);
	let suitCount = new Map();
	for (let suit of suitArr) {
		if (suitCount.has(suit)) {
			suitCount.set(suit, suitCount.get(suit) + 1);
		} else {
			suitCount.set(suit, 1);
		}
	}
	if ([...suitCount.values()].every((count) => count === 2))
		return ["kuttsuki", cardArr];
	if ([...suitCount.values()].some((count) => count === 4))
		return [
			"teshi",
			cardArr.filter((card) => suitCount.get(CARDS[card].month) === 4),
		];
	return [null, [] as CardName[]];
}

export {
	YAKU,
	Yaku,
	YakuName,
	CompletedYaku,
	checkAll,
	getCompleted,
	checkForWin,
};
