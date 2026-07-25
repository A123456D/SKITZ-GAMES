# Certification — App Store (iOS)

## Identity

- [ ] Bundle ID matches export + App Store Connect
- [ ] Team ID / provisioning profiles (dev + distribution)
- [ ] Version + build number bump every upload
- [ ] Icons / launch screen assigned

## Capabilities

- [ ] Game Center enabled; achievements & leaderboards created
- [ ] iCloud / Saved Games if using GC cloud (else local documented)
- [ ] Push only if implemented (default off)

## Review

- [ ] Privacy Nutrition Labels match [PRIVACY.md](../PRIVACY.md)
- [ ] App Privacy Policy URL
- [ ] Age rating / content descriptors
- [ ] Demo account if any gated features (usually N/A)
- [ ] No private API usage from plugins
- [ ] TestFlight build exercised on last-2 iPhone + one iPad if universal

## Technical

- [ ] Portrait primary; landscape does not clip critical UI
- [ ] Notch / Dynamic Island safe area
- [ ] Haptics respect Accessibility toggle
- [ ] `GameCenterPlatformAdapter` wired or local-only disclosed

## QA

- [ ] Background/foreground mid-puzzle
- [ ] Low Power Mode + Battery Saver in-game
- [ ] [PERF_TEST_PLAN.md](../PERF_TEST_PLAN.md) iOS section
