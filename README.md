# homebridge-acinfinity

[![npm version](https://img.shields.io/npm/v/homebridge-acinfinity.svg)](https://www.npmjs.com/package/homebridge-acinfinity)
[![npm downloads](https://img.shields.io/npm/dt/homebridge-acinfinity.svg)](https://www.npmjs.com/package/homebridge-acinfinity)

Homebridge plugin for AC Infinity UIS controllers.

## Features

- Fan speed control (0-100%)
- Temperature and humidity monitoring
- VPD sensor support
- External probe support (temperature, humidity, CO2, soil, water)
- Auto/Manual mode detection
- Automatic device discovery
- Per-port device control

## Installation

```bash
npm install -g homebridge-acinfinity
```

## Configuration

Add to your Homebridge `config.json`:

```json
{
  "platforms": [
    {
      "platform": "ACInfinity",
      "name": "AC Infinity",
      "email": "your-email@example.com",
      "password": "your-password",
      "pollingInterval": 10
    }
  ]
}
```

### Configuration Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `platform` | string | Yes | - | Must be "ACInfinity" |
| `name` | string | Yes | - | Display name for the platform |
| `email` | string | Yes | - | AC Infinity account email |
| `password` | string | Yes | - | AC Infinity account password |
| `pollingInterval` | integer | No | 10 | Update interval in seconds (5-600) |
| `exposeSensors` | boolean | No | false | Expose temperature/humidity sensors |
| `exposePortDevices` | boolean | No | true | Expose port devices as fans |
| `host` | string | No | http://www.acinfinityserver.com | API host URL |
| `debug` | boolean | No | false | Enable debug logging |

## Device Support

### Supported Controllers

| Device | Model | Type | Status |
|--------|-------|------|--------|
| UIS Controller 89 AI+ | CTR89Q | 20 | ✅ Supported |
| UIS Controller 69 Pro+ | CTR69Q | 18 | ✅ Supported |
| UIS Controller 69 Pro | CTR69P | 11 | ✅ Supported |

### Supported Sensors

| Sensor Type | Model | Features |
|-------------|-------|----------|
| Temperature Probe | AC-SPC24 | Temperature, Humidity, VPD |
| CO2 + Light Sensor | AC-COS3 | CO2, Light Level |
| Water Sensor | AC-WDS3 | Water Temperature, pH, EC/TDS |
| Soil Sensor | AC-SLS3 | Soil Moisture |

### Unsupported Devices

| Device | Status | Notes |
|--------|--------|-------|
| Airtap T4/T6 Register Fans | ❌ Not Supported | Standalone devices without controller architecture. See "Help Wanted" below. |
| Controller 67 (Bluetooth) | ❌ Not Supported | Bluetooth-only, no cloud API access |
| Controller 69 (Base) | ❌ Not Supported | Bluetooth-only, no cloud API access |

## HomeKit Services

### Controller Services

Each controller exposes:
- **Temperature Sensor** (optional, via `exposeSensors`)
- **Humidity Sensor** (optional, via `exposeSensors`)

### Port Services

Each connected port device exposes:
- **Fan Service**
  - Active (On/Off)
  - Rotation Speed (0-100%)
  - Current Fan State (Idle/Blowing Air)
  - Target Fan State (Manual/Auto)

### External Sensor Services

External sensors expose appropriate HomeKit services:
- Temperature sensors
- Humidity sensors
- CO2 sensors
- Custom characteristics for water sensors

## Troubleshooting

### Common Issues

**No Devices Found**
- Verify devices are online in the AC Infinity mobile app
- Check credentials are correct
- Ensure devices are registered to your account

**Authentication Failed**
- Verify email and password
- Password is limited to first 25 characters

**Speed Changes Not Persisting**
- Update to v1.3.2 or later
- This was a known issue with Controller 69 Pro, now fixed

**Slow Updates**
- Adjust `pollingInterval` (minimum 5 seconds)
- Lower values increase responsiveness but may cause rate limiting

### Debug Mode

Enable debug logging to troubleshoot:

```json
{
  "platform": "ACInfinity",
  "debug": true
}
```

Debug logs show:
- Device discovery and detection
- API calls and responses
- Controller type detection
- Error details and stack traces

## Help Wanted: Airtap Support

We need help adding support for **Airtap T4/T6 register booster fans**. These standalone devices use a different API structure than controller-based devices.

**How you can help:**

1. Create a GitHub issue titled "Airtap Support - Device Data"
2. Enable debug mode (`"debug": true`)
3. Share the device data from logs (look for `=== DETAILED DEVICE DEBUG INFO ===`)
4. Or contact maintainers to arrange temporary test account access

**Alternative:** The [ESP32 module replacement](https://silocitylabs.com/post/2025/esp32-airtap-esphome/) provides ESPHome/Home Assistant integration.

## Technical Documentation

See [API_REFERENCE.md](API_REFERENCE.md) for:
- AC Infinity API endpoints and payload formats
- Controller-specific implementation details
- Network analysis methodology
- Common API issues and solutions

## Notes

- Uses the same API as the official AC Infinity mobile app
- All communication over HTTP (not HTTPS)
- Temperature values reported in Celsius
- Fan speed mapped from 0-10 (AC Infinity) to 0-100% (HomeKit)

## Credits

Based on [homeassistant-acinfinity](https://github.com/dalinicus/homeassistant-acinfinity) by @dalinicus.

## License

MIT
