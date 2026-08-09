package com.shiftr.pccontroller.tv.discovery

import android.content.Context
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import android.util.Log
import com.shiftr.pccontroller.tv.DiscoveredTv
import com.shiftr.pccontroller.tv.TvProtocol
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import okhttp3.OkHttpClient
import okhttp3.Request
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.Socket
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit

class TvDiscovery(private val context: Context) {
    private val tag = "TvDiscovery"
    private val http =
        OkHttpClient.Builder()
            .connectTimeout(800, TimeUnit.MILLISECONDS)
            .readTimeout(800, TimeUnit.MILLISECONDS)
            .build()

    suspend fun scan(timeoutMs: Long = 2800): List<DiscoveredTv> =
        withContext(Dispatchers.IO) {
            val found = ConcurrentHashMap<String, DiscoveredTv>()

            coroutineScope {
                val jobs =
                    listOf(
                        async { ssdpSearch(found) },
                        async { nsdSearch(found, timeoutMs) },
                        // Full /24 port sweep is too slow on phones — SSDP/NSD + manual IP cover real use.
                    )
                withTimeoutOrNull(timeoutMs) { jobs.awaitAll() }
            }

            found.values.sortedBy { it.name.lowercase() }
        }

    private suspend fun ssdpSearch(out: ConcurrentHashMap<String, DiscoveredTv>) {
        try {
            val socket = DatagramSocket().apply { soTimeout = 1500 }
            val payload =
                """
                M-SEARCH * HTTP/1.1
                HOST: 239.255.255.250:1900
                MAN: "ssdp:discover"
                MX: 2
                ST: ssdp:all
                
                """.trimIndent().replace("\n", "\r\n") + "\r\n"
            val bytes = payload.toByteArray()
            val group = InetAddress.getByName("239.255.255.250")
            socket.send(DatagramPacket(bytes, bytes.size, group, 1900))
            val buf = ByteArray(2048)
            val deadline = System.currentTimeMillis() + 2000
            while (System.currentTimeMillis() < deadline) {
                try {
                    val packet = DatagramPacket(buf, buf.size)
                    socket.receive(packet)
                    val text = String(packet.data, 0, packet.length)
                    val host = packet.address.hostAddress ?: continue
                    classifySsdp(host, text)?.let { out[it.id] = it }
                } catch (_: Exception) {
                    break
                }
            }
            socket.close()
        } catch (e: Exception) {
            Log.w(tag, "ssdp", e)
        }
    }

    private fun classifySsdp(host: String, text: String): DiscoveredTv? {
        val lower = text.lowercase()
        return when {
            "roku" in lower || "ecp" in lower ->
                DiscoveredTv("roku:$host", "Roku ($host)", host, TvProtocol.ROKU, 8060)
            "samsung" in lower || "tizen" in lower ->
                DiscoveredTv("samsung:$host", "Samsung TV ($host)", host, TvProtocol.SAMSUNG, 8001)
            "webos" in lower || "lge" in lower || "lg electronics" in lower ->
                DiscoveredTv("lg:$host", "LG TV ($host)", host, TvProtocol.LG, 3000)
            "sony" in lower || "bravia" in lower || "mediarenderer" in lower && "sony" in lower ->
                DiscoveredTv("bravia:$host", "Bravia ($host)", host, TvProtocol.BRAVIA, 80)
            else -> null
        }
    }

    private suspend fun nsdSearch(out: ConcurrentHashMap<String, DiscoveredTv>, timeoutMs: Long) {
        val nsd = context.getSystemService(Context.NSD_SERVICE) as? NsdManager ?: return
        val types =
            listOf(
                "_androidtvremote2._tcp.",
                "_androidtvremote._tcp.",
            )
        val listeners = mutableListOf<NsdManager.DiscoveryListener>()
        try {
            for (type in types) {
                val listener =
                    object : NsdManager.DiscoveryListener {
                        override fun onStartDiscoveryFailed(serviceType: String?, errorCode: Int) = Unit

                        override fun onStopDiscoveryFailed(serviceType: String?, errorCode: Int) = Unit

                        override fun onDiscoveryStarted(serviceType: String?) = Unit

                        override fun onDiscoveryStopped(serviceType: String?) = Unit

                        override fun onServiceFound(serviceInfo: NsdServiceInfo?) {
                            serviceInfo ?: return
                            try {
                                nsd.resolveService(
                                    serviceInfo,
                                    object : NsdManager.ResolveListener {
                                        override fun onResolveFailed(serviceInfo: NsdServiceInfo?, errorCode: Int) = Unit

                                        override fun onServiceResolved(resolved: NsdServiceInfo?) {
                                            resolved ?: return
                                            val host = resolved.host?.hostAddress ?: return
                                            val name = resolved.serviceName ?: "Android TV"
                                            val proto =
                                                if ("fire" in name.lowercase()) TvProtocol.FIRE_TV
                                                else TvProtocol.ANDROID_TV
                                            val id = "${proto.name.lowercase()}:$host"
                                            out[id] =
                                                DiscoveredTv(
                                                    id = id,
                                                    name = "$name ($host)",
                                                    host = host,
                                                    protocol = proto,
                                                    port = resolved.port,
                                                )
                                        }
                                    },
                                )
                            } catch (_: Exception) {
                            }
                        }

                        override fun onServiceLost(serviceInfo: NsdServiceInfo?) = Unit
                    }
                listeners += listener
                try {
                    nsd.discoverServices(type, NsdManager.PROTOCOL_DNS_SD, listener)
                } catch (_: Exception) {
                }
            }
            delay(timeoutMs.coerceAtMost(2500))
        } finally {
            for (listener in listeners) {
                try {
                    nsd.stopServiceDiscovery(listener)
                } catch (_: Exception) {
                }
            }
        }
    }

    private suspend fun probeSubnet(out: ConcurrentHashMap<String, DiscoveredTv>) {
        val prefix = localPrefix() ?: return
        coroutineScope {
            (1..254).map { last ->
                async(Dispatchers.IO) {
                    val host = "$prefix.$last"
                    if (out.keys.any { it.endsWith(":$host") }) return@async
                    // Roku
                    if (portOpen(host, 8060)) {
                        val name = rokuName(host) ?: "Roku"
                        out["roku:$host"] = DiscoveredTv("roku:$host", "$name ($host)", host, TvProtocol.ROKU, 8060)
                    }
                    // Samsung
                    if (portOpen(host, 8001) || portOpen(host, 8002)) {
                        out.putIfAbsent(
                            "samsung:$host",
                            DiscoveredTv("samsung:$host", "Samsung TV ($host)", host, TvProtocol.SAMSUNG, 8001),
                        )
                    }
                    // LG
                    if (portOpen(host, 3000)) {
                        out.putIfAbsent(
                            "lg:$host",
                            DiscoveredTv("lg:$host", "LG TV ($host)", host, TvProtocol.LG, 3000),
                        )
                    }
                    // Bravia IRCC
                    if (portOpen(host, 80) && braviaLikely(host)) {
                        out.putIfAbsent(
                            "bravia:$host",
                            DiscoveredTv("bravia:$host", "Bravia ($host)", host, TvProtocol.BRAVIA, 80),
                        )
                    }
                    // Android TV remote ports
                    if (portOpen(host, 6466) || portOpen(host, 6467)) {
                        out.putIfAbsent(
                            "androidtv:$host",
                            DiscoveredTv("androidtv:$host", "Android/Google TV ($host)", host, TvProtocol.ANDROID_TV, 6466),
                        )
                    }
                }
            }.awaitAll()
        }
    }

    private fun localPrefix(): String? {
        return try {
            val interfaces = java.net.NetworkInterface.getNetworkInterfaces().toList()
            for (nif in interfaces) {
                if (!nif.isUp || nif.isLoopback) continue
                for (addr in nif.inetAddresses) {
                    if (addr.isLoopbackAddress || addr !is java.net.Inet4Address) continue
                    val host = addr.hostAddress ?: continue
                    val parts = host.split(".")
                    if (parts.size == 4) return parts.take(3).joinToString(".")
                }
            }
            null
        } catch (_: Exception) {
            null
        }
    }

    private fun portOpen(host: String, port: Int): Boolean {
        return try {
            Socket().use { s ->
                s.connect(InetSocketAddress(host, port), 250)
                true
            }
        } catch (_: Exception) {
            false
        }
    }

    private fun rokuName(host: String): String? {
        return try {
            val req = Request.Builder().url("http://$host:8060/query/device-info").get().build()
            http.newCall(req).execute().use { resp ->
                val body = resp.body?.string().orEmpty()
                Regex("<user-device-name>(.*?)</user-device-name>", RegexOption.IGNORE_CASE)
                    .find(body)
                    ?.groupValues
                    ?.getOrNull(1)
                    ?: Regex("<model-name>(.*?)</model-name>", RegexOption.IGNORE_CASE)
                        .find(body)
                        ?.groupValues
                        ?.getOrNull(1)
            }
        } catch (_: Exception) {
            null
        }
    }

    private fun braviaLikely(host: String): Boolean {
        return try {
            val req =
                Request.Builder()
                    .url("http://$host/sony/system")
                    .get()
                    .build()
            http.newCall(req).execute().use { it.code in 200..499 }
        } catch (_: Exception) {
            false
        }
    }
}
