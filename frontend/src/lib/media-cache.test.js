import { describe, expect, it } from 'vitest'
import { cachedMediaUrl, wantedMedia } from './media-cache.js'

const IDX = {
  a: { id: 'a', img: 'a.jpg', gif: 'a.gif' },
  b: { id: 'b', img: 'b.jpg', gif: 'b.gif' },
  old: { id: 'old', img: 'old.jpg', gif: 'old.gif' },
  mine: { id: 'mine', custom: true, img: 'x.jpg' },
}
const NOW = Date.parse('2026-09-23T12:00:00Z')

describe('wantedMedia', () => {
  it('keeps routine exercises and anything logged in the last 60 days', () => {
    const S = {
      routines: [{ ex: [{ id: 'a' }, { id: 'mine' }] }],
      workouts: [{ d: '2026-09-01', entries: [{ id: 'b' }] }, { d: '2026-05-01', entries: [{ id: 'old' }] }],
    }
    expect([...wantedMedia(S, IDX, NOW)].sort()).toEqual(['gif/a.gif', 'gif/b.gif', 'img/a.jpg', 'img/b.jpg'])
  })
  it('skips ids the catalogue does not know', () => {
    expect(wantedMedia({ routines: [{ ex: [{ id: 'gone' }] }] }, IDX, NOW).size).toBe(0)
  })
})

describe('cachedMediaUrl', () => {
  it('is null before the cache has been read, so callers use the network URL', () => {
    expect(cachedMediaUrl('gif', 'a.gif')).toBeNull()
  })
})
