// Update check — compares the installed version (__APP_VERSION__) against
// the latest release tag on GitLab and optionally downloads + installs the APK.
//
// The GitLab releases API is public for this project, so no token is needed.
// On Android (Capacitor), the APK asset is downloaded to the cache directory
// and handed to the system installer via a content:// URI.

import { MOBILE } from './mobile.js'

const GITLAB_PROJECT_ID = 'DuarteSantos8%2Fopengym'
const RELEASES_URL = `https://gitlab.com/api/v4/projects/${GITLAB_PROJECT_ID}/releases`

// Fork: with VITE_UPDATE_REPO ("owner/repo") the check reads that GitHub repository's latest
// release instead of GitLab, and downloads through native HTTP: GitHub's asset host sends no
// CORS header, so a WebView fetch of the APK would be refused.
const UPDATE_REPO = import.meta.env.VITE_UPDATE_REPO || ''
export const RELEASES_PAGE = UPDATE_REPO
  ? `https://github.com/${UPDATE_REPO}/releases`
  : 'https://gitlab.com/DuarteSantos8/opengym/-/releases'

/**
 * Compares two version strings (e.g. "1.2.11" vs "1.3.0", or the fork's "1.3.8-psst.5").
 * Every number counts in order, so a fork build number breaks a tie on the upstream version.
 * Returns  1 if a > b, -1 if a < b, 0 if equal.
 */
export function compareSemver(a, b) {
  const nums = v => v.replace(/^v/, '').split(/[.-]/).map(Number).filter(Number.isFinite)
  const pa = nums(a)
  const pb = nums(b)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0)
    if (diff > 0) return 1
    if (diff < 0) return -1
  }
  return 0
}

/**
 * Checks the GitLab releases API for a newer version.
 * Returns { hasUpdate, latestVersion, apkUrl, hashUrl } or throws on network failure.
 *   - hasUpdate: true if the latest release tag is newer than the running build
 *   - latestVersion: the semver string of the latest release (without "v" prefix)
 *   - apkUrl: direct download URL of the first .apk asset, or null
 *   - hashUrl: direct download URL of the .apk.sha256 hash file, or null
 */
// One request per app session: Settings is opened often, gitlab.com does not need to hear
// about it every time. The promise is cached, a failure is not.
let cached = null
export function resetUpdateCheck() { cached = null }
export async function checkForUpdate() {
  if (!cached) cached = fetchLatest().catch(e => { cached = null; throw e })
  return cached
}
// Fork: VITE_UPDATE_CHECK=0 switches the check off entirely. The fork's APK is built with
// VITE_UPDATE_REPO instead, since upstream's APK is signed with another key and would never
// install over it.
const UPDATE_CHECK = import.meta.env.VITE_UPDATE_CHECK !== '0'
async function fetchLatest() {
  if (!UPDATE_CHECK) return { hasUpdate: false, latestVersion: __APP_VERSION__, apkUrl: null, hashUrl: null }
  if (UPDATE_REPO) return fetchLatestGitHub()
  const res = await fetch(RELEASES_URL + '?per_page=1')
  if (!res.ok) throw new Error(`GitLab API ${res.status}`)
  const releases = await res.json()
  if (!releases.length) return { hasUpdate: false, latestVersion: __APP_VERSION__, apkUrl: null, hashUrl: null }

  const latest = releases[0]
  const latestVersion = latest.tag_name.replace(/^v/, '')
  const hasUpdate = compareSemver(latestVersion, __APP_VERSION__) > 0

  // Find the APK asset among the release links (generic package links) or assets.sources
  let apkUrl = null
  let hashUrl = null
  if (latest.assets?.links?.length) {
    const apkLink = latest.assets.links.find(l => /\.apk$/i.test(l.url) || /\.apk$/i.test(l.direct_asset_url))
    if (apkLink) apkUrl = apkLink.direct_asset_url || apkLink.url
    // Look for a matching .sha256 hash file
    const hashLink = latest.assets.links.find(l => /\.apk\.sha256$/i.test(l.url) || /\.apk\.sha256$/i.test(l.direct_asset_url) || /sha256/i.test(l.name))
    if (hashLink) hashUrl = hashLink.direct_asset_url || hashLink.url
  }

  return { hasUpdate, latestVersion, apkUrl, hashUrl }
}

async function fetchLatestGitHub() {
  const res = await fetch(`https://api.github.com/repos/${UPDATE_REPO}/releases/latest`)
  if (res.status === 404) return { hasUpdate: false, latestVersion: __APP_VERSION__, apkUrl: null, hashUrl: null }
  if (!res.ok) throw new Error(`GitHub API ${res.status}`)
  const latest = await res.json()
  const latestVersion = latest.tag_name.replace(/^v/, '')
  // The API's asset URL (with Accept: application/octet-stream), not browser_download_url:
  // it is the one GitHub serves the file from for a client that is not a browser.
  const asset = re => (latest.assets || []).find(a => re.test(a.name))
  const apk = asset(/\.apk$/i)
  const hash = asset(/\.apk\.sha256$/i)
  return {
    hasUpdate: compareSemver(latestVersion, __APP_VERSION__) > 0,
    latestVersion,
    apkUrl: apk ? apk.url : null,
    hashUrl: hash ? hash.url : null,
  }
}

// Native GET for a release asset (see UPDATE_REPO). `as` is 'text' or 'blob'; a blob comes back
// base64-encoded from the Android bridge.
async function nativeGet(url, as) {
  const { CapacitorHttp } = await import('@capacitor/core')
  const res = await CapacitorHttp.get({ url, headers: { Accept: 'application/octet-stream' }, responseType: as })
  if (res.status < 200 || res.status >= 300) throw new Error(`Download failed: ${res.status}`)
  return res.data
}
const isGitHubAsset = url => /^https:\/\/api\.github\.com\/repos\/[^/]+\/[^/]+\/releases\/assets\//.test(url)

// The checksum file next to the APK, as text.
export async function fetchUpdateText(url) {
  if (MOBILE && isGitHubAsset(url)) return String(await nativeGet(url, 'text'))
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download failed: ${res.status}`)
  return res.text()
}

const base64ToBytes = b64 => Uint8Array.from(atob(b64), c => c.charCodeAt(0))

/**
 * Computes the SHA-256 hash of an ArrayBuffer using the Web Crypto API.
 * Returns the hex-encoded digest string.
 */
export async function sha256(buffer) {
  const hash = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Downloads the APK from `url`, verifies its SHA-256 hash against `expectedHash`
 * (if provided), and triggers the Android installer.
 * Only works on the MOBILE (Capacitor) build with Android.
 *
 * @param {string} url - Direct download URL for the APK
 * @param {string|null} expectedHash - Expected SHA-256 hex string (from .sha256 asset), or null to skip verification
 * @param {function|null} onProgress - Called with (received, total) bytes during download, or null
 */
export async function downloadAndInstall(url, expectedHash = null, onProgress = null) {
  if (!MOBILE) {
    // On web, just open the release page
    window.open(RELEASES_PAGE, '_blank', 'noopener')
    return
  }

  const { Filesystem, Directory } = await import('@capacitor/filesystem')

  // Fork: a GitHub release asset comes through native HTTP in one piece (no progress stream).
  if (isGitHubAsset(url)) {
    if (onProgress) onProgress(0, 0)
    const base64 = String(await nativeGet(url, 'blob'))
    const bytes = base64ToBytes(base64)
    if (onProgress) onProgress(bytes.length, bytes.length)
    if (bytes.length < 100_000) throw new Error('Downloaded file is too small to be a valid APK (' + bytes.length + ' bytes)')
    if (expectedHash) {
      const actualHash = await sha256(bytes.buffer)
      if (actualHash !== expectedHash.toLowerCase().trim()) throw new Error('SHA-256 mismatch — download may be corrupted or tampered with')
    }
    const fileName = 'opengym-update.apk'
    await Filesystem.writeFile({ path: fileName, directory: Directory.Cache, data: base64 })
    const { registerPlugin } = await import('@capacitor/core')
    await registerPlugin('Install').installApk({ fileName })
    return
  }

  // Download with progress tracking via ReadableStream
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download failed: ${res.status}`)

  const total = parseInt(res.headers.get('content-length') || '0', 10)
  const reader = res.body.getReader()
  const chunks = []
  let received = 0

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    received += value.length
    if (onProgress) onProgress(received, total)
  }

  // Reassemble into a single blob
  const blob = new Blob(chunks)

  // Size check: an APK should be at least 100 KB
  if (blob.size < 100_000) {
    throw new Error('Downloaded file is too small to be a valid APK (' + blob.size + ' bytes)')
  }

  // SHA-256 integrity check
  if (expectedHash) {
    const buffer = await blob.arrayBuffer()
    const actualHash = await sha256(buffer)
    if (actualHash !== expectedHash.toLowerCase().trim()) {
      throw new Error('SHA-256 mismatch — download may be corrupted or tampered with')
    }
  }

  // Convert blob to base64
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })

  const fileName = 'opengym-update.apk'
  await Filesystem.writeFile({
    path: fileName,
    directory: Directory.Cache,
    data: base64,
  })

  // Use the local InstallPlugin to trigger the Android package installer
  const { registerPlugin } = await import('@capacitor/core')
  const Install = registerPlugin('Install')
  await Install.installApk({ fileName })
}
