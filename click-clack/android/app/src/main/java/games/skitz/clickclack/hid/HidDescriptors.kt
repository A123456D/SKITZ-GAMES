package games.skitz.clickclack.hid

/**
 * Combo mouse + keyboard descriptor aligned with the proven Kontroller / WearMouse
 * layout Windows accepts. Report IDs: 4 = mouse, 6 = feature, 8 = keyboard.
 *
 * Changing this requires forgetting ClickClack on the PC and re-pairing.
 */
object HidDescriptors {
    /** Proven mouse+keyboard combo (Kontroller MOUSE_KEYBOARD_COMBO). */
    val COMBO: ByteArray =
        byteArrayOf(
            // Mouse TLC
            0x05, 0x01, // USAGE_PAGE (Generic Desktop)
            0x09, 0x02, // USAGE (Mouse)
            0xa1.toByte(), 0x01, // COLLECTION (Application)
            0x05, 0x01, // USAGE_PAGE (Generic Desktop)
            0x09, 0x02, // USAGE (Mouse)
            0xa1.toByte(), 0x02, // COLLECTION (Logical)
            0x85.toByte(), 0x04, // REPORT_ID (Mouse = 4)
            0x09, 0x01, // USAGE (Pointer)
            0xa1.toByte(), 0x00, // COLLECTION (Physical)
            0x05, 0x09, // USAGE_PAGE (Button)
            0x19, 0x01, // USAGE_MINIMUM (Button 1)
            0x29, 0x02, // USAGE_MAXIMUM (Button 2)
            0x15, 0x00, // LOGICAL_MINIMUM (0)
            0x25, 0x01, // LOGICAL_MAXIMUM (1)
            0x75, 0x01, // REPORT_SIZE (1)
            0x95.toByte(), 0x02, // REPORT_COUNT (2)
            0x81.toByte(), 0x02, // INPUT (Data,Var,Abs)
            0x95.toByte(), 0x01, // REPORT_COUNT (1)
            0x75, 0x06, // REPORT_SIZE (6)
            0x81.toByte(), 0x03, // INPUT (Cnst,Var,Abs)
            0x05, 0x01, // USAGE_PAGE (Generic Desktop)
            0x09, 0x30, // USAGE (X)
            0x09, 0x31, // USAGE (Y)
            0x16, 0x01, 0xf8.toByte(), // LOGICAL_MINIMUM (-2047)
            0x26, 0xff.toByte(), 0x07, // LOGICAL_MAXIMUM (2047)
            0x75, 0x10, // REPORT_SIZE (16)
            0x95.toByte(), 0x02, // REPORT_COUNT (2)
            0x81.toByte(), 0x06, // INPUT (Data,Var,Rel)
            0xa1.toByte(), 0x02, // COLLECTION (Logical)
            0x85.toByte(), 0x06, // REPORT_ID (Feature = 6)
            0x09, 0x48, // USAGE (Resolution Multiplier)
            0x15, 0x00,
            0x25, 0x01,
            0x35, 0x01,
            0x45, 0x04,
            0x75, 0x02,
            0x95.toByte(), 0x01,
            0xb1.toByte(), 0x02, // FEATURE
            0x85.toByte(), 0x04, // REPORT_ID (Mouse)
            0x09, 0x38, // USAGE (Wheel)
            0x15, 0x81.toByte(),
            0x25, 0x7f,
            0x35, 0x00,
            0x45, 0x00,
            0x75, 0x08,
            0x95.toByte(), 0x01,
            0x81.toByte(), 0x06,
            0xc0.toByte(),
            0xa1.toByte(), 0x02,
            0x85.toByte(), 0x06,
            0x09, 0x48,
            0x15, 0x00,
            0x25, 0x01,
            0x35, 0x01,
            0x45, 0x04,
            0x75, 0x02,
            0x95.toByte(), 0x01,
            0xb1.toByte(), 0x02,
            0x35, 0x00,
            0x45, 0x00,
            0x75, 0x04,
            0xb1.toByte(), 0x03,
            0x85.toByte(), 0x04,
            0x05, 0x0c, // USAGE_PAGE (Consumer)
            0x0a, 0x38, 0x02, // USAGE (AC Pan)
            0x15, 0x81.toByte(),
            0x25, 0x7f,
            0x75, 0x08,
            0x95.toByte(), 0x01,
            0x81.toByte(), 0x06,
            0xc0.toByte(),
            0xc0.toByte(),
            0xc0.toByte(),
            0xc0.toByte(),
            // Keyboard
            0x05, 0x01,
            0x09, 0x06,
            0xa1.toByte(), 0x01,
            0x85.toByte(), 0x08, // REPORT_ID (Keyboard = 8)
            0x05, 0x07,
            0x19, 0xe0.toByte(),
            0x29, 0xe7.toByte(),
            0x15, 0x00,
            0x25, 0x01,
            0x75, 0x01,
            0x95.toByte(), 0x08,
            0x81.toByte(), 0x02,
            0x95.toByte(), 0x01,
            0x75, 0x08,
            0x81.toByte(), 0x01,
            // Match Pc Controller's six-key report. Windows caches one HID
            // descriptor for the phone, so both apps must use the same shape.
            0x95.toByte(), 0x06,
            0x75, 0x08,
            0x15, 0x00,
            0x25, 0x65,
            0x05, 0x07,
            0x19, 0x00,
            0x29, 0x65,
            0x81.toByte(), 0x00,
            0xc0.toByte(),
        )

    const val MOUSE_REPORT_ID = 4
    const val FEATURE_REPORT_ID = 6
    const val KEYBOARD_REPORT_ID = 8
}
