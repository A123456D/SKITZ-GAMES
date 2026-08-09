package com.shiftr.pccontroller.tv

/** Shared action → vendor key mapping helpers. */
object TvActions {
    fun streamingAppId(action: String, protocol: TvProtocol): String? {
        return when (protocol) {
            TvProtocol.ROKU ->
                when (action) {
                    "netflix" -> "12"
                    "prime" -> "13"
                    "disney" -> "291097"
                    "appletv" -> "551012"
                    else -> null
                }
            TvProtocol.SAMSUNG ->
                when (action) {
                    "netflix" -> "11101200001"
                    "prime" -> "3201907919771"
                    "disney" -> "3201907016597"
                    "appletv" -> "3201910019365"
                    else -> null
                }
            TvProtocol.LG ->
                when (action) {
                    "netflix" -> "netflix"
                    "prime" -> "amazon"
                    "disney" -> "com.disney.disneyplus-prod"
                    "appletv" -> "com.apple.appletv"
                    else -> null
                }
            TvProtocol.ANDROID_TV, TvProtocol.FIRE_TV ->
                when (action) {
                    "netflix" -> "https://www.netflix.com/title"
                    "prime" -> "https://app.primevideo.com"
                    "disney" -> "https://www.disneyplus.com"
                    "appletv" -> "https://tv.apple.com"
                    else -> null
                }
            TvProtocol.BRAVIA ->
                when (action) {
                    "netflix" -> "Netflix"
                    "prime" -> "Prime Video"
                    "disney" -> "Disney+"
                    "appletv" -> "Apple TV"
                    else -> null
                }
            else -> null
        }
    }
}
