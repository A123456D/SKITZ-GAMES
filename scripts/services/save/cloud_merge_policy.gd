class_name CloudMergePolicy
extends RefCounted
## Resolves local vs remote profile payloads using timestamp + checksum.
## Emits conflict when both sides differ and neither is a clear ancestor.

enum Decision { USE_LOCAL, USE_REMOTE, CONFLICT }


static func decide(local_meta: Dictionary, remote_meta: Dictionary) -> Dictionary:
	## Returns { decision: Decision, reason: String }
	if remote_meta.is_empty():
		return {"decision": Decision.USE_LOCAL, "reason": "no_remote"}
	if local_meta.is_empty():
		return {"decision": Decision.USE_REMOTE, "reason": "no_local"}

	var lc := str(local_meta.get("checksum", ""))
	var rc := str(remote_meta.get("checksum", ""))
	if lc != "" and lc == rc:
		return {"decision": Decision.USE_LOCAL, "reason": "identical_checksum"}

	var lt := int(local_meta.get("updated_unix", 0))
	var rt := int(remote_meta.get("updated_unix", 0))
	if lt > rt:
		return {"decision": Decision.USE_LOCAL, "reason": "local_newer"}
	if rt > lt:
		return {"decision": Decision.USE_REMOTE, "reason": "remote_newer"}

	# Same timestamp, different checksum → player must choose.
	return {"decision": Decision.CONFLICT, "reason": "same_time_different_checksum"}


static func meta_from_profile(profile: Dictionary) -> Dictionary:
	var raw := JSON.stringify(profile)
	return {
		"updated_unix": int(profile.get("updated_unix", Time.get_unix_time_from_system())),
		"checksum": raw.md5_text(),
		"schema_version": int(profile.get("schema_version", SaveSchema.CURRENT_VERSION)),
		"slot": str(profile.get("slot", "0")),
	}
