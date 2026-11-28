import { describe, expect, it } from 'vitest'
import { readTopBarBlockSize } from '../useTopBarHeight'

describe('readTopBarBlockSize', () => {
  it('uses the border box when the observer provides one', () => {
    expect(
      readTopBarBlockSize({
        borderBoxSize: [{ blockSize: 64 }],
        target: { getBoundingClientRect: () => ({ height: 10 }) },
      }),
    ).toBe(64)
  })

  it('falls back to the element rect when the border box is missing', () => {
    expect(
      readTopBarBlockSize({
        target: { getBoundingClientRect: () => ({ height: 72.4 }) },
      }),
    ).toBe(72.4)
  })

  it('ignores a bar that is not laid out', () => {
    expect(
      readTopBarBlockSize({
        borderBoxSize: [{ blockSize: 0 }],
        target: { getBoundingClientRect: () => ({ height: 0 }) },
      }),
    ).toBeNull()
  })
})
