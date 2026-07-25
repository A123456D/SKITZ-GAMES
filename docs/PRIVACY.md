# Privacy

SHIFTR is rated Everyone / PEGI 3 oriented. Privacy is **opt-in analytics**, crash reporting toggle, and a first-run consent gate.

## Policy URLs

Replace placeholders before store submission:

| Constant | Default |
| --- | --- |
| `PrivacyConsent.PRIVACY_POLICY_URL` | `https://example.com/shiftr/privacy` |
| `PrivacyConsent.TERMS_URL` | `https://example.com/shiftr/terms` |

Host real documents; Settings and the consent gate open these via `OS.shell_open`.

**Strings sanity (iteration 6):** consent copy lives in `localization/shiftr.csv` (`PRIVACY_*` keys) with en/es/fr. Gate + Settings still open the placeholder URLs until you replace the constants above — do not ship with `example.com`.

## Consent gate

Scene: `scenes/ui/screens/privacy_consent_screen.tscn`  
Shown from `MainShell` when `privacy.needs_gate()` (`consent_version` < `PrivacyConsent.CONSENT_VERSION`).

Choices:

- **Continue** — respects analytics checkbox + crash checkbox.
- **Essential only** — analytics off; crash follows checkbox (default on).

Age gate stub: `age_gate_passed` stored for store questionnaires; wire a real DOB / “I am 13+” UI if a region requires it.

## Data inventory

| Data | Stored where | Purpose | Optional? |
| --- | --- | --- | --- |
| Settings (volume, a11y, quality) | Local save | UX | No (local only) |
| Campaign / economy progress | Local + cloud mirror | Gameplay | No |
| Achievement progress | Local + platform mirror | Meta | No |
| Leaderboard scores you submit | Local cache + platform | Competition | Yes (don’t play ranked) |
| Analytics events (aggregate) | Buffer → platform sink | Improve balance / funnels | **Yes — opt-in** |
| Crash stacks + breadcrumbs | Platform crash SDK | Stability | Toggle (default on) |
| Locale preference | Local save | UI language | No |
| Cloud sync flag | Local save | Sync | Toggle |

**Not collected by default:** advertising ID, contacts, precise location, microphone, camera, email (unless a future account system with separate consent).

## Retention

| Class | Retention guidance |
| --- | --- |
| Local saves | Until player clears app data / uninstall |
| Cloud mirrors | Until player deletes cloud slot / account unlink (store-specific) |
| Analytics | Aggregate; retain per vendor policy (document 13–26 months typical); honor deletion requests via store/account flows |
| Crash reports | Vendor default (often 90 days); disable via Settings |

## Player controls

| Control | Location |
| --- | --- |
| Analytics on/off | Settings → Privacy & sync |
| Crash reports on/off | Settings → Privacy & sync |
| Cloud sync on/off | Settings → Privacy & sync |
| Re-read policy | Settings → Privacy policy |

When analytics is off, `AnalyticsService` drops events and clears buffer on flush.

## Compliance notes

- GDPR / UK GDPR: lawful basis for analytics = consent; document in policy.
- COPPA / kids: if marketing under 13, disable analytics by default and avoid behavioral ads (SHIFTR IAP is cosmetics — still review ad SDK if added).
- App Store Privacy Nutrition Labels / Play Data safety: fill from this inventory; update when adding SDKs.

See [certification/privacy.md](./certification/privacy.md).
