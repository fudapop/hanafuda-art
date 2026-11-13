export function sleep(ms = 1000) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function getRange(n: number) {
  return [...Array(n)]
}

export function getChance(percentSuccess: number) {
  return Math.floor(Math.random() * 100) < percentSuccess
}

type ChanceFn = () => unknown

export function withChance(percentSuccess: number, fn: ChanceFn, logFailure?: boolean) {
  if (getChance(percentSuccess)) return fn()
  if (logFailure) console.log('Chance failed. Function not executed.')
}

/**
 * Pick one item from a list.
 *
 * @param arr - Non-empty list to choose from
 * @returns A random element of `arr`
 * @throws When `arr` is empty
 */
export function getRandom<T>(arr: readonly T[]): T {
  const item = arr[Math.floor(Math.random() * arr.length)]
  if (item === undefined) {
    throw new Error('getRandom requires a non-empty array')
  }
  return item
}

export function getRandomString(length: number) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'.split('')
  let key = ''
  for (const _ of getRange(length)) {
    const char = getRandom(chars)
    key += getChance(50) ? char.toUpperCase() : char
  }
  return key
}

export function convertObjArrToRecord(
  arr: Record<string, any>[],
  keyProp: string,
  transformKey?: (param: string) => string,
): Record<string, any> {
  const record = Object.fromEntries(
    arr.map((obj) => {
      const key = transformKey ? transformKey(obj[keyProp]) : obj[keyProp]
      const val = { ...obj }
      const { [keyProp]: _removed, ...rest } = val
      return [key, rest]
    }),
  )
  return record
}

export const consoleLogColor = (
  msg: string,
  color?: string,
  level: 'info' | 'debug' | 'warn' | 'error' = 'info',
) => {
  const colorMap = {
    info: 'blue',
    debug: 'green',
    warn: 'yellow',
    error: 'red',
  }
  return console[level](`%c${msg}`, `color: ${color || colorMap[level]};`)
}
