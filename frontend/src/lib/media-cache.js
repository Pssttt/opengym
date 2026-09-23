// Fork (upstream issue #281): the mobile build loads exercise media from a CDN, so a gym with no
// signal shows broken demos. This keeps the image and GIF of every exercise you actually train
// (your routines, plus anything logged in the last 60 days) in the app's own storage, and
// imgSrc/gifSrc in lib/exercises.js serve those local copies first.
//
// Mobile only. Until initMediaCache() has run — and always in the web build and under Node —
// cachedMediaUrl returns null and every caller falls back to the network URL it always used.

const DIR = 'media'
const RECENT_DAYS = 60

let files = null        // Set of cached file names, e.g. 'gif/0576-DOoWcnA.gif'
let toLocal = null      // cached file name → URL the WebView can load
let syncing = null

// The local URL for one media file, or null when it is not cached (yet).
export function cachedMediaUrl(kind, name) {
  if (!files || !name) return null
  const key = kind + '/' + name
  return files.has(key) ? toLocal(key) : null
}

// The media file names worth keeping: every exercise in a routine and every one logged
// recently. `exIndex` is the id → exercise map (EXIDX), passed in to keep this module free of
// a lib/exercises.js import.
export function wantedMedia(S, exIndex, now = Date.now()) {
  const ids = new Set()
  for (const r of S?.routines || []) for (const e of r.ex || []) ids.add(e.id)
  const since = new Date(now - RECENT_DAYS * 86400000).toISOString().slice(0, 10)
  for (const w of S?.workouts || []) if ((w.d || '') >= since) for (const e of w.entries || []) ids.add(e.id)
  const out = new Set()
  for (const id of ids) {
    const ex = exIndex[id]
    if (!ex || ex.custom) continue
    if (ex.img) out.add('img/' + ex.img)
    if (ex.gif) out.add('gif/' + ex.gif)
  }
  return out
}

async function fs() {
  const { Filesystem, Directory } = await import('@capacitor/filesystem')
  return { Filesystem, Directory }
}

// Reads what is already cached. Safe to call more than once.
export async function initMediaCache() {
  if (files) return
  const { Filesystem, Directory } = await fs()
  const { Capacitor } = await import('@capacitor/core')
  const found = new Set()
  for (const kind of ['img', 'gif']) {
    try {
      const { files: list } = await Filesystem.readdir({ path: DIR + '/' + kind, directory: Directory.Data })
      for (const f of list) found.add(kind + '/' + (typeof f === 'string' ? f : f.name))
    } catch { /* nothing cached yet */ }
  }
  const { uri } = await Filesystem.getUri({ path: DIR, directory: Directory.Data })
  toLocal = key => Capacitor.convertFileSrc(uri + '/' + key)
  files = found
}

const toBase64 = blob => new Promise((resolve, reject) => {
  const r = new FileReader()
  r.onload = () => resolve(String(r.result).split(',')[1])
  r.onerror = reject
  r.readAsDataURL(blob)
})

// Downloads what `wanted` has and the cache lacks, and deletes what it no longer needs. One run
// at a time; a failed download is simply retried on the next run. `bases` maps kind → CDN base.
export async function syncMediaCache(wanted, bases) {
  if (syncing) return syncing
  syncing = (async () => {
    await initMediaCache()
    const { Filesystem, Directory } = await fs()
    for (const key of wanted) {
      if (files.has(key)) continue
      const [kind, name] = key.split('/')
      try {
        const res = await fetch(bases[kind] + name)
        if (!res.ok) continue
        await Filesystem.writeFile({ path: DIR + '/' + key, directory: Directory.Data, data: await toBase64(await res.blob()), recursive: true })
        files.add(key)
      } catch { /* offline or storage full: try again next time */ }
    }
    for (const key of [...files]) {
      if (wanted.has(key)) continue
      try { await Filesystem.deleteFile({ path: DIR + '/' + key, directory: Directory.Data }); files.delete(key) } catch { /* leave it */ }
    }
  })().finally(() => { syncing = null })
  return syncing
}
