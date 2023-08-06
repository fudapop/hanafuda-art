class TimeoutWrapper {
	#fn;
	#key;
	duration;
	callback?;
	startMsg?;
	endMsg?;
	#id?: NodeJS.Timeout;

	/**
	 *
	 * @param fn Wrapped function to call on timer start
	 * @param ms Duration of the timeout
	 * @param key Identifies the timeout instance
	 * @param callback Callback function to run on timer end
	 * @param startMsg Message to log on timer start
	 * @param endMsg Message to log on timer end
	 */
	constructor(
		fn: Function,
		ms: number,
		key: string,
		callback?: Function,
		startMsg?: string,
		endMsg?: string
	) {
		this.#fn = fn;
		this.#key = key;
		this.duration = ms;
		this.callback = callback;
		this.startMsg = startMsg;
		this.endMsg = endMsg;
	}

	get key() {
		return this.#key;
	}

	get id() {
		return this.#id;
	}

	async #runFn() {
		await this.#fn();
		this.clear();
	}

	/**
	 * Calls the wrapped function
	 * followed by setTimeout.#
	 *
	 * Stores the instance in the class property activeTimeouts
	 * using the instance key
	 *
	 */
	start() {
		this.#id = setTimeout(() => {
			console.debug(`[${this.key}]`, this.endMsg || "timeout ended");
			this.callback?.();
		}, this.duration);
		console.debug(`[${this.key}]`, this.startMsg || "timeout started");
		return this.#runFn();
	}

	/**
	 * Clears the timeout using the instance id.
	 */
	clear() {
		clearTimeout(this.#id);
		console.debug(`[${this.key}]`, "timeout cleared");
	}
}

export {
	TimeoutWrapper,
}