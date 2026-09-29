# openGym+ (personal fork)

Private fork of [DuarteSantos8/openGym](https://github.com/DuarteSantos8/openGym) with
custom features. `main` is upstream plus the fork's commits.

## Getting a build
Every push to `main` that touches `frontend/` runs `.github/workflows/apk.yml`: tests,
mobile build, signed APK, published as a GitHub Release `v<upstream>-psst.<run>`.
Download the `.apk` from Releases and install over the previous openGym+.

The app installs as `ch.duartesantos.opengym.psst` ("openGym+"), next to the official app.
The in-app update check is off in this build (`VITE_UPDATE_CHECK=0`).

## Signing key
Kept outside the repo in `~/Desktop/projects/opengym-signing/`, and as the repo secrets
`ANDROID_KEYSTORE_B64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`. Losing it means
every future update needs an uninstall.

## Pulling in upstream
```bash
git fetch upstream --tags
git merge v1.3.9            # the new upstream release tag
git push
```
Fork-only changes are kept in separate files where possible (`custom.gradle`,
`src/release/res`) so merges rarely conflict.

## Fork-only changes
Based on upstream v1.3.9 (rebuilt 2026-09-29; the v1.3.8-based history is on `fork-v1.3.8`).
- English only: `VITE_ENGLISH_ONLY=1` forces English and hides the Language row; CI deletes the
  language packs from the build only, so the source and its tests match upstream
- Auto-finish: a workout idle for 3 h ends at its last set (`frontend/src/lib/auto-finish.js`)
- Weight steps: per-exercise real machine weights; progression and the set +/- move rung to
  rung (`frontend/src/lib/weight-steps.js`, exercise menu → Weight steps)
- In-app update check reads this fork's GitHub releases (`VITE_UPDATE_REPO`, build number in
  the version via `APP_VERSION_SUFFIX`)
- Offline exercise media in the APK: routine and recent exercises' images/GIFs kept on the
  phone (`frontend/src/lib/media-cache.js`; upstream's #281 covers only the installed web app)
- arm64-only APK (upstream keeps 32-bit ARM too)
- Separate app id and name, CI-number versionCode (`frontend/android/app/custom.gradle`)
- Weekly upstream-release check that opens an issue (`.github/workflows/upstream-release.yml`)
- Upstream's mirror, Pages, Docker publish and Dependabot configs removed
