class_name PrivacyConsent
extends RefCounted
## Consent gate state. Persists under profile.privacy. Analytics are opt-in;
## crash reporting defaults on but can be disabled. Age gate stub for stores.

signal consent_changed

const CONSENT_VERSION := 1
## Replace with your hosted policy URL before store submission.
const PRIVACY_POLICY_URL := "https://example.com/shiftr/privacy"
const TERMS_URL := "https://example.com/shiftr/terms"

var save: SaveService = null


func configure(p_save: SaveService) -> void:
	save = p_save


func needs_gate() -> bool:
	var p := _privacy()
	return int(p.get("consent_version", 0)) < CONSENT_VERSION


func analytics_allowed() -> bool:
	return bool(_privacy().get("analytics_opt_in", false))


func crash_allowed() -> bool:
	return bool(_privacy().get("crash_opt_in", true))


func age_gate_passed() -> bool:
	return bool(_privacy().get("age_gate_passed", false))


func set_analytics_opt_in(on: bool) -> void:
	_privacy()["analytics_opt_in"] = on
	_commit()


func set_crash_opt_in(on: bool) -> void:
	_privacy()["crash_opt_in"] = on
	_commit()


func accept_gate(analytics: bool, crash: bool = true, age_ok: bool = true) -> void:
	var p := _privacy()
	p["analytics_opt_in"] = analytics
	p["crash_opt_in"] = crash
	p["age_gate_passed"] = age_ok
	p["consent_version"] = CONSENT_VERSION
	p["consent_unix"] = int(Time.get_unix_time_from_system())
	_commit()


func open_privacy_policy() -> void:
	OS.shell_open(PRIVACY_POLICY_URL)


func open_terms() -> void:
	OS.shell_open(TERMS_URL)


func _privacy() -> Dictionary:
	if save == null:
		return {}
	if not save.profile.has("privacy"):
		save.profile["privacy"] = {
			"analytics_opt_in": false,
			"crash_opt_in": true,
			"consent_version": 0,
			"age_gate_passed": false,
		}
	return save.profile["privacy"]


func _commit() -> void:
	if save:
		save.save_local()
	consent_changed.emit()
