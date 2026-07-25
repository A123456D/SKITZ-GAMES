extends Control
## First-run privacy / analytics consent. Shown when PrivacyConsent.needs_gate().

signal finished

@onready var _title: Label = %Title
@onready var _body: Label = %Body
@onready var _analytics: CheckButton = %AnalyticsToggle
@onready var _crash: CheckButton = %CrashToggle
@onready var _policy: Button = %PolicyButton
@onready var _accept: Button = %AcceptButton
@onready var _essential: Button = %EssentialButton


func _ready() -> void:
	_title.text = tr("PRIVACY_TITLE")
	_body.text = tr("PRIVACY_BODY")
	_analytics.text = tr("PRIVACY_ANALYTICS")
	_crash.text = tr("PRIVACY_CRASH")
	_policy.text = tr("PRIVACY_POLICY_LINK")
	_accept.text = tr("PRIVACY_ACCEPT")
	_essential.text = tr("PRIVACY_ESSENTIAL")
	_analytics.button_pressed = false
	_crash.button_pressed = true
	_policy.pressed.connect(_on_policy)
	_accept.pressed.connect(_on_accept.bind(true))
	_essential.pressed.connect(_on_accept.bind(false))
	ControllerNav.link_vertical([_analytics, _crash, _policy, _accept, _essential])
	ControllerNav.focus_first([_accept])


func _on_policy() -> void:
	var gs := get_node_or_null("/root/GameServices")
	if gs and gs.privacy:
		gs.privacy.open_privacy_policy()
	else:
		OS.shell_open(PrivacyConsent.PRIVACY_POLICY_URL)


func _on_accept(with_analytics: bool) -> void:
	var gs := get_node_or_null("/root/GameServices")
	if gs:
		var analytics_on := with_analytics and _analytics.button_pressed
		var crash_on := _crash.button_pressed
		gs.privacy.accept_gate(analytics_on, crash_on, true)
		gs.analytics.track(AnalyticsEvents.PRIVACY_CONSENT, {
			"analytics": analytics_on,
			"crash": crash_on,
		})
		gs.analytics.session_start()
	finished.emit()
	queue_free()
