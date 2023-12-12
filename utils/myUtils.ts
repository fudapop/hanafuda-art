function sleep(ms = 1000) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRange(n: number) {
	return [...Array(n)];
}

function getChance(percentSuccess: number) {
	return Math.floor(Math.random() * 100) < percentSuccess;
}

function withChance(percentSuccess: number, fn: Function, logFailure?: boolean) {
	if (getChance(percentSuccess)) return fn();
	if (logFailure) console.log("Chance failed. Function not executed.");
}

function getRandom<T>(arr: Array<T>): T {
	return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomString(length: number) {
	const chars = "abcdefghijklmnopqrstuvwxyz0123456789".split("");
	let key = "";
	for (const _ of getRange(length)) {
		let char = getRandom(chars);
		key += getChance(50) ? char.toUpperCase() : char;
	}
	return key;
}

function convertObjArrToRecord(arr: Record<string, any>[], keyProp: string, transformKey?: (param: string) => string): Record<string, any> {
	const record = Object.fromEntries(arr.map(obj => {
		const key = transformKey
			? transformKey(obj[keyProp])
			: obj[keyProp];
		const val = { ...obj };
		delete val[keyProp];
		return [key, val];
	}))
	console.log("Converted array to record:", record);
	return record;
}

const consoleLogColor = (msg: string, color: string) =>
	console.log(`%c${msg}`, `color: ${color};`);

export {
	sleep,
	getRange,
	getChance,
	withChance,
	getRandom,
	getRandomString,
	convertObjArrToRecord,
	consoleLogColor,
}