import { describe, expect, it } from 'vitest'
import { applySavedLikes } from '../useAnnouncements'

describe('applySavedLikes', () => {
  it('replaces a cached like with an unlike saved on the account', () => {
    const cached = ['spring', 'unsaved']
    const saved = {
      spring: { likes: 0 },
      summer: { likes: 1 },
    }

    expect(applySavedLikes(cached, saved)).toEqual(['unsaved', 'summer'])
  })

  it('keeps the cache when Firestore has not returned those announcements', () => {
    expect(applySavedLikes(['spring'], {})).toEqual(['spring'])
  })
})
