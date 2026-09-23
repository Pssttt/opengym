// Fork: progression on an exercise with its own weight steps (lib/weight-steps.js).
import { describe, it, expect } from 'vitest'
import { nextPrescription } from './progression.js'
import { EXDB, isAssisted } from './exercises.js'

const LIFT = EXDB.find(e => e.bp !== 'cardio' && !['upper legs', 'lower legs', 'back', 'hips', 'glutes'].includes(e.bp) && !['body weight', 'band', 'resistance band'].includes(e.eq) && !isAssisted(e.id)).id
const STACK = [18, 25, 32, 39, 45, 52]

const hist = (rows, target, exSteps = { [LIFT]: STACK }) => ({
  unit: 'kg',
  exSteps,
  workouts: rows.map((row, i) => ({
    d: '2026-01-0' + (i + 1),
    entries: [{ id: LIFT, target: target || { sets: 3, reps: 10, weight: row[0] }, sets: row.slice(1).map(r => ({ w: row[0], r, done: true })) }]
  }))
})

describe('progression on weight steps', () => {
  it('double progression moves up one rung, and says by how much', () => {
    const cfg = { id: LIFT, sets: 3, reps: 12, repsMin: 8, weight: 32, prog: 'double' }
    const p = nextPrescription(hist([[32, 12, 12, 12]], cfg), cfg)
    expect(p.kind).toBe('up')
    expect(p.weight).toBe(39)
    expect(p.why[1]).toBe(7)
  })

  it('linear progression moves up one rung', () => {
    const cfg = { id: LIFT, sets: 3, reps: 10, weight: 25, prog: 'linear' }
    const p = nextPrescription(hist([[25, 10, 10, 10]]), cfg)
    expect(p.weight).toBe(32)
  })

  it('a stall deloads to a rung under the weight', () => {
    const cfg = { id: LIFT, sets: 3, reps: 10, weight: 45, prog: 'linear' }
    const p = nextPrescription(hist([[45, 10, 10, 6], [45, 10, 10, 6], [45, 10, 10, 6]]), cfg)
    expect(p.kind).toBe('deload')
    expect(STACK).toContain(p.weight)
    expect(p.weight).toBeLessThan(45)
  })

  it('without steps it keeps the ordinary increment', () => {
    const cfg = { id: LIFT, sets: 3, reps: 10, weight: 25, prog: 'linear' }
    const p = nextPrescription(hist([[25, 10, 10, 10]], null, {}), cfg)
    expect(p.weight).toBe(27.5)
  })
})
