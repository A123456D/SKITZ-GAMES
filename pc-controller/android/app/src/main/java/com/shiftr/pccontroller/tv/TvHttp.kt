package com.shiftr.pccontroller.tv

import okhttp3.OkHttpClient
import java.security.SecureRandom
import java.security.cert.X509Certificate
import java.util.concurrent.TimeUnit
import javax.net.ssl.SSLContext
import javax.net.ssl.TrustManager
import javax.net.ssl.X509TrustManager

/** LAN TV remotes use self-signed certs (Samsung 8002, LG 3001). */
object TvHttp {
    fun client(
        connectSec: Long = 8,
        readMs: Long = 0,
        pingSec: Long = 20,
    ): OkHttpClient {
        val trustAll =
            object : X509TrustManager {
                override fun checkClientTrusted(chain: Array<X509Certificate>, authType: String) = Unit

                override fun checkServerTrusted(chain: Array<X509Certificate>, authType: String) = Unit

                override fun getAcceptedIssuers(): Array<X509Certificate> = emptyArray()
            }
        val ssl = SSLContext.getInstance("TLS")
        ssl.init(null, arrayOf<TrustManager>(trustAll), SecureRandom())
        val builder =
            OkHttpClient.Builder()
                .connectTimeout(connectSec, TimeUnit.SECONDS)
                .readTimeout(readMs, TimeUnit.MILLISECONDS)
                .sslSocketFactory(ssl.socketFactory, trustAll)
                .hostnameVerifier { _, _ -> true }
        if (pingSec > 0 && readMs == 0L) {
            builder.pingInterval(pingSec, TimeUnit.SECONDS)
        }
        return builder.build()
    }
}
