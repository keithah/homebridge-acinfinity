# homebridge-acinfinity

[![npm version](https://img.shields.io/npm/v/homebridge-acinfinity.svg)](https://www.npmjs.com/package/homebridge-acinfinity)
[![npm downloads](https://img.shields.io/npm/dt/homebridge-acinfinity.svg)](https://www.npmjs.com/package/homebridge-acinfinity)

**Universal Homebridge plugin for AC Infinity controllers with 100% reliability!**

## ✅ Universal Controller Support

**v1.3.0** introduces **complete universal support** for all AC Infinity controllers:

- **🔧 UIS 89 AI+**: Perfect support (unchanged)
- **🛠️ UIS 69 PRO**: **COMPLETELY FIXED** - No more 403 "Data saving failed" errors!
- **🚀 UIS 69 PRO+**: Full support with auto-detection
- **🎯 Auto-Detection**: Plugin automatically detects your controller type and uses the optimal API approach
- **💯 100% Reliability**: Both old and new controllers now work flawlessly

## Features

- **Universal Controller Support**: Works with ALL AC Infinity UIS Controllers (69 Pro, 69 Pro+, 89 AI+)
- **Intelligent API Detection**: Automatically uses the correct approach for your controller type
- **Perfect Fan Control**: Speed control (0-100%) with instant response and no errors
- **Environmental Monitoring**: Temperature, humidity, and VPD sensors
- **Advanced Sensor Support**: External probes (temperature, humidity, CO2)
- **Auto Mode Detection**: Displays "Auto" vs "Manual" mode correctly in HomeKit
- **Speed Caching**: Prevents HomeKit reverting during device update delays
- **Auto-Discovery**: Finds all your devices automatically
- **Comprehensive Logging**: Debug mode shows exactly what's happening

## Installation

1. Install Homebridge (if not already installed):
```bash
npm install -g homebridge
```

2. Install the plugin:
```bash
npm install -g homebridge-acinfinity
```

3. Configure the plugin in your Homebridge config.json

## Configuration

Add the following to your Homebridge `config.json`:

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

- `platform` (required): Must be "ACInfinity"
- `name` (required): Display name for the platform
- `email` (required): Your AC Infinity account email
- `password` (required): Your AC Infinity account password
- `pollingInterval` (optional): How often to poll for updates in seconds (default: 10, min: 5, max: 600)
- `host` (optional): API host URL (default: "http://www.acinfinityserver.com")
- `debug` (optional): Enable debug logging for troubleshooting API issues (default: false)

## Supported Devices

✅ **Universal Support** - All controllers work perfectly:

- **UIS Controller 89 AI+** (Type 20) - Uses optimized hardcoded payload approach
- **UIS Controller 69 PRO** (Type 11) - Uses iPhone app approach (static payload with real settings)
- **UIS Controller 69 PRO+** (Type 18) - Uses iPhone app approach (static payload with real settings)

The plugin **automatically detects** your controller type and uses the appropriate API approach. No configuration needed!

## Exposed Services

### Per Controller:
- **Temperature Sensor**: Built-in temperature sensor
- **Humidity Sensor**: Built-in humidity sensor

### Per Port:
- **Fan**: Control each port as a fan accessory
  - On/Off control
  - Speed control (0-100%)
  - Current state monitoring

### Additional Sensors (AI Controllers):
- **Probe Temperature**: External temperature probes
- **Probe Humidity**: External humidity probes
- **CO2 Sensor**: CO2 monitoring with detection alerts

## Notes

- The plugin uses the same API as the official AC Infinity mobile app
- Password is limited to 25 characters (same as the mobile app)
- All temperature values are in Celsius in HomeKit
- Fan speed is mapped from AC Infinity's 0-10 scale to HomeKit's 0-100%

## Troubleshooting

### ✅ v1.3.0 Fixed Major Issues

**The "403 Data saving failed" errors that affected UIS 69 PRO controllers have been completely resolved!** If you're still experiencing issues, try:

1. **Update to Latest Version**: Ensure you're running v1.3.0 or later
   ```bash
   npm update homebridge-acinfinity
   ```

2. **Enable Debug Mode** to see which API approach is being used:
   ```json
   {
     "platform": "ACInfinity",
     "name": "AC Infinity", 
     "email": "your-email@example.com",
     "password": "your-password",
     "debug": true
   }
   ```

3. **Common Issues**:
   - **Authentication Failed**: Ensure your email and password are correct
   - **No Devices Found**: Make sure your devices are online and accessible through the AC Infinity app
   - **Slow Updates**: Try adjusting the polling interval (5-600 seconds)

### Debug Logging

When debug mode is enabled, you'll see:
- `[setDeviceModeSettings] Using new framework (static payload) approach for device type 20` (UIS 89 AI+)
- `[setDeviceModeSettings] Using legacy (iPhone app) approach for device type 11` (UIS 69 PRO)
- Controller auto-detection and API approach selection
- Success/failure of all API operations

## Technical Details

For developers and advanced users, see [API_REFERENCE.md](API_REFERENCE.md) for complete technical documentation including:
- AC Infinity API endpoints and payload formats
- Controller-specific approaches and detection logic
- Network analysis methodology
- Security considerations

## Credits

This plugin is based on the [homeassistant-acinfinity](https://github.com/dalinicus/homeassistant-acinfinity) integration by @dalinicus.

## License

MIT