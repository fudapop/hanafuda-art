const activeTimeouts = reactive(new Map())

export const useTimeout = () => {
  type CreateTimeoutFn = (
    fn: Function,
    duration: number,
    key: string,
    options: TimeoutOptions,
  ) => () => Promise<void>

  interface TimeoutOptions {
    callback?: Function
    startMsg?: string
    endMsg?: string
  }

  const getActiveTimeouts = computed(() => activeTimeouts)

  /**
   * @implements TimeoutWrapper
   */
  const addTimeout: CreateTimeoutFn = (fn, duration, key, options: TimeoutOptions) => {
    const args = Object.values(options)
    const fnWithTimeout = new TimeoutWrapper(fn, duration, key, ...args)
    activeTimeouts.set(key, fnWithTimeout)
    console.log(getActiveTimeouts.value)
    return () => fnWithTimeout.start()
  }

  const errorOnTimeout: CreateTimeoutFn = (fn, duration, key, options) => {
    const errTimeout = new TimeoutWrapper(
      fn,
      duration,
      key,
      () => {
        options.callback?.()
        const message = `Function call (${fn.name}) has timed out.`
        throw Error(message)
      },
      options.startMsg,
      options.endMsg,
    )
    activeTimeouts.set(key, errTimeout)
    return () => errTimeout.start()
  }

  return {
    addTimeout,
    errorOnTimeout,
    getActiveTimeouts,
  }
}
