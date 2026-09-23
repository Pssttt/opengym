// Fork: an exercise's real loadable weights ("weight steps"), for machines whose pin stack does
// not sit on an even grid in the profile's unit — a 15 lb stack logged in kg reads 18, 25, 32,
// 39, 45… and no single increment reaches those. With a ladder set, progression and the set-row
// stepper move rung to rung instead of adding a fixed step. Stored as S.exSteps[exId], sorted
// ascending, in the profile's unit.

const EPS = 0.05
const round1 = v => Math.round(v * 10) / 10

// Comma/space separated text → the sorted, de-duplicated positive weights it names.
export function parseLadder(text) {
  const nums = String(text || '').split(/[\s,;]+/).map(Number).filter(n => Number.isFinite(n) && n > 0).map(round1)
  return [...new Set(nums)].sort((a, b) => a - b)
}

export const formatLadder = ladder => (ladder || []).join(', ')

// A pin stack in pounds, expressed in `unit`: `count` plates from `first` lb every `step` lb.
// Kilograms are rounded to the whole number, the way a converted stack is read off the machine.
export function stackLadder({ first, step, count }, unit) {
  if (!(first > 0) || !(step > 0) || !(count > 0)) return []
  const lb = Array.from({ length: Math.min(60, Math.round(count)) }, (_, i) => first + i * step)
  return parseLadder(lb.map(v => (unit === 'lb' ? v : Math.round(v * 0.45359237))).join(','))
}

// The ladder for an exercise, or null when none is set. Two rungs is the least that says
// anything about a step.
export function ladderOf(S, exId) {
  const l = S?.exSteps?.[exId]
  return Array.isArray(l) && l.length >= 2 ? l : null
}

// `n` rungs from `w` in `dir` (+1 up, −1 down). A weight between rungs moves to the next rung in
// that direction first. Past either end the ladder is extended by its end gap, so a lift that
// outgrows the stack still progresses; downwards it never goes below 0.
export function ladderStep(ladder, w, dir, n = 1) {
  let v = Number(w) || 0
  for (let i = 0; i < n; i++) {
    if (dir > 0) {
      const next = ladder.find(r => r > v + EPS)
      v = next != null ? next : round1(v + (ladder[ladder.length - 1] - ladder[ladder.length - 2]))
    } else {
      const prev = [...ladder].reverse().find(r => r < v - EPS)
      v = prev != null ? prev : Math.max(0, round1(v - (ladder[1] - ladder[0])))
    }
  }
  return v
}

// A deload on the ladder: the highest rung at or under `w * factor`, always strictly below `w`
// so a deload always takes something off, and never below the bottom rung.
export function ladderDeload(ladder, w, factor) {
  const target = (Number(w) || 0) * factor
  const under = ladder.filter(r => r <= target + EPS && r < w - EPS)
  if (under.length) return under[under.length - 1]
  const below = ladder.filter(r => r < w - EPS)
  return below.length ? below[below.length - 1] : ladder[0]
}
