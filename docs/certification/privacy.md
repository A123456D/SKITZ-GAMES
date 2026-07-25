# Certification — Privacy

Use with [PRIVACY.md](../PRIVACY.md) before each store submission.

## Documents

- [ ] Privacy policy HTTPS live (not `example.com`)
- [ ] Terms of service live if IAP enabled
- [ ] `PrivacyConsent.PRIVACY_POLICY_URL` / `TERMS_URL` updated in code
- [ ] Store privacy forms (Play Data safety / Apple Nutrition) match inventory

## In-app

- [ ] First-run consent gate shows when `consent_version` outdated
- [ ] Analytics default **off** until opt-in
- [ ] Crash toggle available; default on but user-changeable
- [ ] Settings can open policy link
- [ ] Cloud sync toggle does not force analytics
- [ ] Age gate field present for future regional requirements

## SDKs

- [ ] Each analytics / crash / ads SDK listed in policy
- [ ] No SDK initialized before consent when legally required
- [ ] Secrets (DSN, API keys) not in git

## Data subject requests

- [ ] Process documented for access/delete (store account + support email)
- [ ] Local clear-data instructions documented for players

## Sign-off

| Store | Legal / Prod | Date | Pass |
| --- | --- | --- | --- |
| Steam | | | ☐ |
| Google Play | | | ☐ |
| App Store | | | ☐ |
| Web | | | ☐ |
