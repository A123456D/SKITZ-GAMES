class_name WorkshopSchema
extends Object
## Workshop package constants. Version bumps when breaking field semantics.
##
## WHY schema_version: community levels outlive game builds. Importers migrate
## known older envelopes instead of silently misreading boards.

const FORMAT := "shiftr_workshop_puzzle"
const SCHEMA_VERSION := 1
const FILE_EXTENSION := "shiftr.json"
const ALT_EXTENSION := "shiftrpz"
const CLIPBOARD_FORMAT := "shiftr_editor_clipboard"

## Required top-level keys for a valid workshop file.
const REQUIRED_KEYS: PackedStringArray = [
	"format",
	"schema_version",
	"puzzle",
]
