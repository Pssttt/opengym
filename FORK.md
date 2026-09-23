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
- Upstream PR #296: Android rest countdown in a notification
- Separate app id and name, CI-number versionCode (`frontend/android/app/custom.gradle`)
- Update check disabled at build time (`frontend/src/lib/update.js`)
- Upstream's mirror, Pages and Docker publish workflows removed
