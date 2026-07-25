# Certification — Steam / Steam Deck

## Store

- [ ] App ID created; depot configured
- [ ] Build uploaded via SteamPipe; branches (default / beta) set
- [ ] Achievements created in Steamworks partner site matching GDD ids
- [ ] Leaderboards created (Daily moves, Endless score)
- [ ] Cloud save quota enabled if using Steam Cloud (else document local-only)
- [ ] Store page: capsules, trailer, description, categories (Puzzle)
- [ ] Age rating questionnaire complete
- [ ] Pricing / release date / coming soon checklist
- [ ] Steamworks SDK / GodotSteam linked; `SteamPlatformAdapter` extension points implemented
- [ ] Export uses `custom_features=steam`
- [ ] No secrets in depot (no keystores, no internal URLs with tokens)

## Deck verification

- [ ] Verified on Steam Deck OLED/LCD at 60 FPS playable
- [ ] Official controls layout uploaded (glyphs match `ControllerNav` / board map)
- [ ] Text readable at arm’s length; Settings reachable with gamepad only
- [ ] Suspend/resume mid-puzzle keeps progress
- [ ] Proton not required for native Windows/Linux builds you ship
- [ ] Proton notes if shipping Windows-only

## Controller

- [ ] Full UI navigation without touch
- [ ] Board D-pad + face buttons documented in Steam overlay
- [ ] Remap profile documented (even if in-game remap ships later)

## Privacy

- [ ] Privacy policy URL set in Steamworks
- [ ] Analytics opt-in respected when backend enabled
