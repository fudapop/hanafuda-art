import { Awaitable } from "@vueuse/core";

type CreateTimeoutFn = (
	fn: Function,
	duration: number,
	key: string,
	options: TimeoutOptions
) => InstanceType<typeof TimeoutWrapper>;

interface TimeoutOptions {
	callback?: Function;
	startMsg?: string;
	endMsg?: string;
}

export const useTimeout = () => {
	const activeTimeouts = reactive(new Map());
	const getActiveTimeouts = computed(() => activeTimeouts);

	/**
	 * @implements TimeoutWrapper
	 */
	const addTimeout: CreateTimeoutFn = (
		fn,
		duration,
		key,
		options: TimeoutOptions
	) => {
		const args = Object.values(options);
		const fnWithTimeout = new TimeoutWrapper(fn, duration, key, ...args);
		activeTimeouts.set(key, fnWithTimeout);
		console.log(getActiveTimeouts.value);
		return fnWithTimeout;
	};

	const errorOnTimeout: Awaitable<CreateTimeoutFn> = (
		fn,
		duration,
		key,
		options
	) => {
		const errTimeout = new TimeoutWrapper(
			fn,
			duration,
			key,
			() => {
				options.callback?.();
				const message = `Function call (${fn.name}) has timed out.`;
				throw Error(message);
			},
			options.startMsg,
			options.endMsg
		);
		activeTimeouts.set(key, errTimeout);
		console.log(getActiveTimeouts.value);
		return errTimeout;
	};

	return {
		addTimeout,
		errorOnTimeout,
		getActiveTimeouts,
	};
};
