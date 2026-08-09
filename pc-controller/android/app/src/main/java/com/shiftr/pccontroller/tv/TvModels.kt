package com.shiftr.pccontroller.tv

enum class TvProtocol {
    ROKU,
    SAMSUNG,
    LG,
    BRAVIA,
    ANDROID_TV,
    FIRE_TV,
    BLUETOOTH_HID,
}

data class DiscoveredTv(
    val id: String,
    val name: String,
    val host: String,
    val protocol: TvProtocol,
    val port: Int = 0,
    val meta: Map<String, String> = emptyMap(),
)

interface TvClient {
    val protocol: TvProtocol
    val deviceName: String
    val host: String

    suspend fun connect(): Result<Unit>
    suspend fun disconnect()
    suspend fun sendAction(action: String, down: Boolean): Boolean
    suspend fun sendKeyCode(code: String, down: Boolean): Boolean
    suspend fun launchApp(appId: String): Boolean
}
