class_name AchievementDef
extends Resource
## Skill / exploration badge definition (GDD §12).

enum Tier { BRONZE, SILVER, GOLD, PLATINUM }

@export var id: StringName = &""
@export var title: String = ""
@export var description: String = ""
@export var tier: Tier = Tier.BRONZE
@export_range(0, 100, 1) var progress: int = 0
@export_range(1, 100, 1) var target: int = 1
@export var unlocked: bool = false
@export var unlocked_label: String = ""


func tier_name() -> String:
	match tier:
		Tier.BRONZE:
			return "Bronze"
		Tier.SILVER:
			return "Silver"
		Tier.GOLD:
			return "Gold"
		Tier.PLATINUM:
			return "Platinum"
	return ""


func progress_ratio() -> float:
	return clampf(float(progress) / float(maxi(1, target)), 0.0, 1.0)
