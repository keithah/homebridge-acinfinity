# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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