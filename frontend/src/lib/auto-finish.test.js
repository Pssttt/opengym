import { describe, expect, it } from 'vitest'
import { AUTO_FINISH_MS, lastActivityAt, staleActiveEnd } from './auto-finish.js'

const H = 60 * 60 * 1000
const session = (extra = {}) => ({
  start: 1_000_000,
  entries: [{ id: '0025', sets: [{ w: 32, r: 10, done: true }, { w: 32, r: 10, done: false }] }],
  ...extra,
})

describe('staleActiveEnd', () => {
  it('ends a session idle past the window at its last ticked set', () => {
    const A = session({ lastSetAt: 1_000_000 + H })
    expect(staleActiveEnd(A, A.lastSetAt + AUTO_FINISH_MS)).toBe(A.lastSetAt)
  })

  it('leaves a session inside the window alone', () => {
    const A = session({ lastSetAt: 1_000_000 + H })
    expect(staleActiveEnd(A, A.lastSetAt + AUTO_FINISH_MS - 1)).toBeNull()
  })

  it('falls back to the start when no tick time was recorded', () => {
    const A = session()
    expect(staleActiveEnd(A, A.start + 67 * H)).toBe(A.start)
  })

  it('never closes a session with nothing ticked', () => {
    const A = session({ entries: [{ id: '0025', sets: [{ w: 32, r: 10, done: false }] }] })
    expect(staleActiveEnd(A, A.start + 67 * H)).toBeNull()
  })

  it('never closes a backfilled session or a missing one', () => {
    expect(staleActiveEnd(session({ backfill: true }), 1_000_000 + 67 * H)).toBeNull()
    expect(staleActiveEnd(null)).toBeNull()
  })
})

describe('lastActivityAt', () => {
  it('is the later of the start and the last tick', () => {
    expect(lastActivityAt({ start: 5, lastSetAt: 9 })).toBe(9)
    expect(lastActivityAt({ start: 5 })).toBe(5)
  })
})
