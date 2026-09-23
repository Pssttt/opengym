// Fork: a session left running (the phone locked mid-workout and never finished) is closed on
// its own once nothing has been ticked for AUTO_FINISH_MS, so a forgotten Finish cannot record
// a 67-hour workout and skew the time stats and the heatmap.

export const AUTO_FINISH_MS = 3 * 60 * 60 * 1000

// When the session really ended: the last ticked set, or the start for a session whose ticks
// predate lastSetAt (sessions begun on an older build).
export const lastActivityAt = A => Math.max(A?.lastSetAt || 0, A?.start || 0)

// The end time to record for a stale session, or null when it should be left alone: nothing
// running, a backfilled session (it has its own end), no set ticked at all (nothing to keep),
// or still within the idle window.
export function staleActiveEnd(A, now = Date.now()) {
  if (!A || A.backfill || !A.start) return null
  const anyDone = (A.entries || []).some(e => (e.sets || []).some(s => s.done))
  if (!anyDone) return null
  const last = lastActivityAt(A)
  return now - last >= AUTO_FINISH_MS ? last : null
}
