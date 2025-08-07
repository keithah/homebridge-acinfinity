# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.3] - 2025-08-07

### Added
- Debug mode configuration option for troubleshooting API issues
  - Enable with `"debug": true` in config or checkbox in Homebridge UI
  - Logs all API requests/responses with headers and payloads
  - Helps diagnose 403 "Data saving failed" errors
- Debug logging for fan speed reading and port updates

### Fixed
- Fan speed now shows actual current speed in Auto mode instead of max configured speed
  - Uses real-time `loadState` value instead of fetching settings from API
  - Rotation speed updates automatically when port state changes
  - Resolves issue where Auto mode displayed max speed instead of actual running speed
- Reduced verbose logging in normal operation
  - Device JSON data now only shown in debug mode
  - Cache restoration messages moved to debug level
  - Removed duplicate login messages

### Changed
- Simplified release workflow to trigger on GitHub releases instead of tags

## [1.2.2] - 2025-08-07

### Added
- Debug mode configuration option for troubleshooting API issues
  - Enable with `"debug": true` in config or checkbox in Homebridge UI
  - Logs all API requests/responses with headers and payloads
  - Helps diagnose 403 "Data saving failed" errors
- Debug logging for fan speed reading and port updates

### Fixed
- Fan speed now shows actual current speed in Auto mode instead of max configured speed
  - Uses real-time `loadState` value instead of fetching settings from API
  - Rotation speed updates automatically when port state changes
  - Resolves issue where Auto mode displayed max speed instead of actual running speed
- Reduced verbose logging in normal operation
  - Device JSON data now only shown in debug mode
  - Cache restoration messages moved to debug level
  - Removed duplicate login messages

## [1.2.1] - 2025-01-28

### Changed
- Updated sensor accessory names to use device name instead of generic "Controller"
- Temperature sensor now named "{DeviceName} Temperature" (e.g., "Closet Fan Temperature")
- Humidity sensor now named "{DeviceName} Humidity" (e.g., "Closet Fan Humidity")
- More descriptive and user-friendly naming for better HomeKit organization

## [1.2.0] - 2025-01-28

### Added
- **Smart Port Filtering**: Only active/connected ports are now exposed to HomeKit (no more empty "Port 3", "Port 4", etc.)
- **Optional Temperature & Humidity Sensors**: New `exposeSensors` configuration option to create separate HomeKit accessories for controller sensors
- Configuration option in Homebridge UI to enable/disable sensor exposure

### Changed
- Inactive ports (offline or no load connected) are automatically filtered out
- Cleaner HomeKit representation with only functional devices

### Technical Changes
- Added `ACInfinitySensor` class for dedicated sensor accessories
- Updated platform logic to check `port.online` and `port.loadState` before creating accessories
- Extended configuration schema with `exposeSensors` boolean option

## [1.1.0] - 2025-01-28

### Changed
- **BREAKING:** Complete restructure of HomeKit representation
  - Individual fan ports now appear as separate accessories instead of services under one controller
  - Each port gets its proper name (e.g., "Fan in attic", "Bottom intake fan") instead of generic "Closet Fan"
  - Eliminates the confusing grid of identical "Closet Fan" tiles
  - Controller device is no longer exposed as a separate accessory

### Removed
- Main controller accessory (only individual ports are now exposed)

### Technical Changes
- Created new `ACInfinityFanPort` class for individual port accessories
- Updated platform discovery to register each port as a separate accessory
- Modified update mechanism to work with individual port instances

## [1.0.5] - 2025-01-28

### Fixed
- Include CHANGELOG.md and API.md in npm package for Homebridge UI changelog display
- Add changelog URL to package.json for better integration with Homebridge UI

## [1.0.4] - 2025-01-28

### Fixed
- **CRITICAL:** Fixed data structure access for ports and sensors
  - Ports are now correctly accessed via `device.deviceInfo.ports[]` instead of `device.ports[]`
  - Temperature and humidity now correctly accessed via `device.deviceInfo.temperature/humidity`
  - Fixed value scaling: temperature and humidity values are now divided by 100 for correct readings
  - Fixed all sensor and port data path references throughout the codebase
- Individual fan ports now properly expose as separate HomeKit accessories
- Temperature and humidity sensors now show correct values (e.g., 24.39°C instead of 2439°C)

### Added
- Comprehensive API documentation (`API.md`) with real examples and curl commands
- Complete data structure reference for developers
- Documentation of all sensor types, port states, and value formats

### Technical Details
- Your "Fan in attic" and "Bottom intake fan" should now appear as individual controllable fans in HomeKit
- Temperature readings should show ~24°C instead of impossible values
- Humidity readings should show ~49% instead of impossible values

## [1.0.3] - 2025-01-28

### Added
- Detailed debug logging for device discovery and API calls
- Enhanced error reporting for troubleshooting

### Fixed
- Improved error handling during device discovery
- Better logging of API responses for debugging

## [1.0.2] - 2025-01-28

### Fixed
- Fixed Model characteristic error when deviceInfo is an object instead of string
- Resolved circular reference causing accessory persistence failures
- Fixed "Converting circular structure to JSON" errors
- Accessories now persist properly between Homebridge restarts

### Changed
- Controller instances now stored in platform map instead of accessory context
- Improved cleanup of controller instances on accessory removal

## [1.0.1] - 2025-01-28

### Fixed
- Automated npm publishing via GitHub Actions
- GitHub release creation workflow

## [1.0.0] - 2025-01-28

### Added
- Initial release of AC Infinity Homebridge plugin
- Support for AC Infinity UIS Controllers (69 Pro, 69 Pro+, 89 AI+)
- Temperature and humidity sensor monitoring
- Fan port control with speed adjustment (0-100%)
- Additional probe sensor support (temperature, humidity, CO2)
- Auto-discovery of devices on network
- Configurable polling interval (5-600 seconds)
- HomeKit integration with proper service types:
  - Temperature sensors
  - Humidity sensors  
  - Fan controls for each port
  - CO2 sensors with detection alerts

### Technical Features
- TypeScript implementation with full type safety
- Async/await API client with proper error handling
- Homebridge platform plugin architecture
- Configuration validation and schema
- Automatic builds and npm publishing via GitHub Actions

[Unreleased]: https://github.com/keithah/homebridge-acinfinity/compare/v1.0.5...HEAD
[1.0.5]: https://github.com/keithah/homebridge-acinfinity/compare/v1.0.4...v1.0.5
[1.0.4]: https://github.com/keithah/homebridge-acinfinity/compare/v1.0.3...v1.0.4
[1.0.3]: https://github.com/keithah/homebridge-acinfinity/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/keithah/homebridge-acinfinity/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/keithah/homebridge-acinfinity/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/keithah/homebridge-acinfinity/releases/tag/v1.0.0