export function sleep(ms = 1000) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getRandom<T>(arr: Array<T>): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export const consoleLogColor = (msg: string, color: string) =>
  console.log(`%c${msg}`, `color: ${color};`);
