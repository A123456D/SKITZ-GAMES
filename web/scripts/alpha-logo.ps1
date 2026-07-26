param(
  [Parameter(Mandatory = $true)][string]$In,
  [Parameter(Mandatory = $true)][string]$Out
)

# Converts a black-on-white logo PNG into a white mark with luminance-driven
# alpha, so the game can tint it per theme via source-in compositing.
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class LogoAlpha
{
    public static void Convert(string inPath, string outPath)
    {
        using (var loaded = new Bitmap(inPath))
        using (var src = new Bitmap(loaded)) // force 32bppArgb copy we own
        using (var dst = new Bitmap(src.Width, src.Height, PixelFormat.Format32bppArgb))
        {
            var rect = new Rectangle(0, 0, src.Width, src.Height);
            var sData = src.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
            var dData = dst.LockBits(rect, ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
            int len = Math.Abs(sData.Stride) * src.Height;
            var sBuf = new byte[len];
            var dBuf = new byte[len];
            Marshal.Copy(sData.Scan0, sBuf, 0, len);
            for (int i = 0; i < len; i += 4)
            {
                int lum = (sBuf[i] + sBuf[i + 1] + sBuf[i + 2]) / 3;
                // Squash near-white noise to fully transparent, near-black to opaque.
                int a = 255 - lum;
                a = (a - 16) * 255 / (255 - 16 - 16);
                if (a < 0) a = 0;
                if (a > 255) a = 255;
                dBuf[i] = 255;
                dBuf[i + 1] = 255;
                dBuf[i + 2] = 255;
                dBuf[i + 3] = (byte)a;
            }
            Marshal.Copy(dBuf, 0, dData.Scan0, len);
            src.UnlockBits(sData);
            dst.UnlockBits(dData);
            dst.Save(outPath, ImageFormat.Png);
        }
    }
}
"@

[LogoAlpha]::Convert((Resolve-Path $In).Path, $Out)
Write-Host "wrote $Out"
