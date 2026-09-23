import { describe, expect, it } from 'vitest'
import { parseLadder, formatLadder, stackLadder, ladderOf, ladderStep, ladderDeload } from './weight-steps.js'

const STACK = [18, 25, 32, 39, 45, 52, 59]

describe('parseLadder', () => {
  it('sorts, de-duplicates and drops what is not a positive number', () => {
    expect(parseLadder('39, 18 25;25  x -5 0 32')).toEqual([18, 25, 32, 39])
  })
  it('round-trips through formatLadder', () => {
    expect(parseLadder(formatLadder(STACK))).toEqual(STACK)
  })
})

describe('stackLadder', () => {
  it('reads a 15 lb stack the way it is logged in kg', () => {
    expect(stackLadder({ first: 40, step: 15, count: 7 }, 'kg')).toEqual([18, 25, 32, 39, 45, 52, 59])
  })
  it('keeps pounds as they are for an lb profile', () => {
    expect(stackLadder({ first: 10, step: 10, count: 3 }, 'lb')).toEqual([10, 20, 30])
  })
  it('returns nothing for an incomplete description', () => {
    expect(stackLadder({ first: 0, step: 15, count: 5 }, 'kg')).toEqual([])
  })
})

describe('ladderOf', () => {
  it('needs at least two rungs', () => {
    expect(ladderOf({ exSteps: { a: [18] } }, 'a')).toBeNull()
    expect(ladderOf({ exSteps: { a: [18, 25] } }, 'a')).toEqual([18, 25])
    expect(ladderOf({}, 'a')).toBeNull()
  })
})

describe('ladderStep', () => {
  it('moves one rung at a time', () => {
    expect(ladderStep(STACK, 32, 1)).toBe(39)
    expect(ladderStep(STACK, 32, -1)).toBe(25)
    expect(ladderStep(STACK, 32, 1, 2)).toBe(45)
  })
  it('lands on the next rung from a weight between rungs', () => {
    expect(ladderStep(STACK, 30, 1)).toBe(32)
    expect(ladderStep(STACK, 30, -1)).toBe(25)
  })
  it('extends past the ends by the end gap, never below zero', () => {
    expect(ladderStep(STACK, 59, 1)).toBe(66)
    expect(ladderStep(STACK, 18, -1)).toBe(11)
    expect(ladderStep([5, 20], 5, -1)).toBe(0)
  })
})

describe('ladderDeload', () => {
  it('takes the highest rung at or under the deload target', () => {
    expect(ladderDeload(STACK, 45, 0.9)).toBe(39)
  })
  it('always takes something off, even when the target rounds back to the weight', () => {
    expect(ladderDeload(STACK, 25, 0.99)).toBe(18)
  })
  it('stays on the bottom rung', () => {
    expect(ladderDeload(STACK, 18, 0.9)).toBe(18)
  })
})

describe('unit switch', () => {
  it('converts the ladders with every other stored weight', async () => {
    const { convertStateUnit } = await import('./units.js')
    const out = convertStateUnit({ unit: 'kg', exSteps: { a: [18, 25] } }, 'lb')
    expect(out.exSteps.a.every(v => v > 39 && v < 56)).toBe(true)
    expect(out.exSteps.a[0]).toBeLessThan(out.exSteps.a[1])
  })
})

describe('sync merge', () => {
  it('keeps the steps set on either device', async () => {
    const { mergeStates } = await import('./sync-merge.js')
    const base = { workouts: [], routines: [], bodyweight: [], customEx: [], exWeights: {} }
    const out = mergeStates({ ...base, _ts: 2, exSteps: { a: [18, 25] } }, { ...base, _ts: 1, exSteps: { b: [5, 10] } })
    expect(out.exSteps).toEqual({ a: [18, 25], b: [5, 10] })
  })
})
