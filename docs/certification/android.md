# Certification — Google Play

## App identity

- [ ] Package `com.<studio>.shiftr` finalized (matches export preset)
- [ ] Signing: upload key + Play App Signing enrolled
- [ ] `versionCode` increments every upload; `versionName` semver
- [ ] Target API level meets Play requirements for the year

## Store listing

- [ ] Short/long description, screenshots (phone + 7" / 10" if needed), feature graphic
- [ ] Content rating questionnaire (IARC)
- [ ] Data safety form matches [PRIVACY.md](../PRIVACY.md)
- [ ] Privacy policy URL live HTTPS
- [ ] Target audience / Designed for Families if applicable

## Technical

- [ ] arm64-v8a AAB tested on physical device
- [ ] Permissions minimized (Internet if analytics/cloud; Vibrate for haptics)
- [ ] Play Games achievements/leaderboards IDs mapped
- [ ] `GooglePlayPlatformAdapter` plugin linked or temporary local-only noted in release notes
- [ ] Back button / gesture: pops UI stack, does not soft-lock
- [ ] Safe areas / cutouts respected
- [ ] Background save on `NOTIFICATION_APPLICATION_PAUSED`

## Monetization (when enabled)

- [ ] License tester accounts
- [ ] No pay-to-win (GDD); cosmetics only
- [ ] Ads policy: no mid-puzzle interstitials

## QA

- [ ] [PERF_TEST_PLAN.md](../PERF_TEST_PLAN.md) Android section passed
- [ ] Pre-launch report / internal testing track green
