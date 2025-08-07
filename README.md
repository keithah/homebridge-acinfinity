# homebridge-acinfinity

Homebridge plugin for AC Infinity controllers.

## Features

- Support for AC Infinity UIS Controllers (69 Pro, 69 Pro+, 89 AI+)
- Control fan ports (on/off, speed control)
- Monitor temperature and humidity sensors
- Support for additional probe sensors (temperature, humidity, CO2)
- Auto-discovery of devices
- Configurable polling interval

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

- UIS Controller 69 Pro
- UIS Controller 69 Pro+
- UIS Controller 89 AI+

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

1. **Authentication Failed**: Ensure your email and password are correct
2. **No Devices Found**: Make sure your devices are online and accessible through the AC Infinity app
3. **Slow Updates**: Try adjusting the polling interval in the configuration
4. **API Errors (403 Forbidden)**: Enable debug mode to see detailed API requests and responses:
   ```json
   {
     "platform": "ACInfinity",
     "name": "AC Infinity",
     "email": "your-email@example.com",
     "password": "your-password",
     "debug": true
   }
   ```
   This will log all API requests/responses to help diagnose issues with "Data saving failed" errors

## Credits

This plugin is based on the [homeassistant-acinfinity](https://github.com/dalinicus/homeassistant-acinfinity) integration by @dalinicus.

## License

MIT