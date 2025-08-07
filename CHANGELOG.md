# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.8] - 2025-08-07

### Fixed
- **HTTP Session Persistence**: Implemented proper connection keepalive matching Home Assistant behavior
  - Added persistent HTTP/HTTPS agents with keepalive enabled
  - Single connection per host prevents connection-based rate limiting
  - Matches Home Assistant's aiohttp ClientSession behavior
  - Eliminates 403 "Data saving failed" errors caused by multiple connections appearing as different clients
- **Removed Aggressive Retry Logic**: Eliminated retry mechanism that was cascading failures
  - Removed exponential backoff retry that was making rate limiting worse
  - Simplified error handling to prevent request amplification
  - Cleaner failure handling reduces API load during issues

### Technical Changes
- Added proper HTTP Agent configuration with maxSockets: 1 and keepalive
- Enhanced cleanup method to properly dispose of HTTP connection pools
- Removed throttling and retry logic that was interfering with natural request flow
- Improved session management to match official AC Infinity app behavior

### Background
The root cause was connection-based rate limiting. AC Infinity's servers treat each new HTTP connection as a separate client, so axios creating multiple connections triggered rate limits while Home Assistant's persistent aiohttp sessions worked fine. This fix ensures all requests use a single persistent connection like the official app and Home Assistant.

## [1.2.7] - 2025-08-07

### Fixed
- **API Request Coordination**: Implemented centralized request queue to prevent rate limiting
  - Added sequential request processing to eliminate simultaneous API calls
  - API requests now queued with 500ms spacing between calls
  - Prevents multiple accessories from overwhelming AC Infinity API simultaneously
  - Significantly reduces "Data saving failed" (403) errors when changing multiple fan speeds
  - Better debug logging shows queue status and request processing

### Technical Changes
- Added `queueRequest()` method to platform for centralized API coordination
- Updated `setSpeed()` to use request queue instead of direct API calls
- Updated `updateDevices()` to use queued requests for better coordination
- Added request queue processing with proper spacing and error handling
- Enhanced debug logging for request queue operations

## [1.2.6] - 2025-08-07

### Fixed
- **Enhanced Rate Limiting Protection**: Improved API retry logic and request throttling
  - Increased retry attempts from 3 to 5 total attempts
  - Implemented exponential backoff delays (2s, 4s, 6s, 8s) instead of fixed 1s delay
  - Added global request throttling with minimum 1.5 second intervals between API calls
  - More aggressive approach to handle persistent "Data saving failed" errors
  - Better debug logging for throttling and retry attempts
- **Session Management Improvements**: Enhanced HTTP client reliability and connection handling
  - Increased request timeout from 10s to 15s for slower API responses
  - Added proper HTTP session cleanup with `cleanup()` method
  - Enhanced connection error handling with specific error types (ECONNRESET, ETIMEDOUT, etc.)
  - Improved server error detection and recovery (5xx status codes)
  - Added interceptor cleanup to prevent memory leaks during reconnection

### Technical Changes
- Enhanced `setDeviceModeSettings()` with more robust retry mechanism
- Added `throttleRequest()` method to prevent rapid successive API calls
- Improved error handling with exponential backoff strategy
- Added request timing tracking to prevent API overload
- Added `handleHttpError()` method for consistent error handling across all API calls
- Improved axios configuration with better connection pooling and validation
- Enhanced cleanup procedures for proper resource disposal

## [1.2.5] - 2025-08-07

### Fixed
- **API Rate Limiting**: Fixed 403 "Data saving failed" errors when setting fan speed
  - Added retry logic with 1-second delays (up to 3 attempts) matching Home Assistant implementation
  - Specifically handles rate limiting errors from AC Infinity API
  - Prevents rapid API calls from failing with "Please try again later" messages
  - Improves reliability when HomeKit makes multiple consecutive speed changes

### Technical Changes
- Updated `setDeviceModeSettings()` with intelligent retry mechanism
- Added proper error detection for rate limiting vs other API failures
- Enhanced logging to show retry attempts and rate limit warnings

## [1.2.4] - 2025-08-07

### Fixed
- **Critical Fix**: Fan speed reporting now shows actual current speed instead of always 10%
  - Fixed bug introduced in v1.2.3 where `loadState` (0/1) was used instead of actual power level
  - Now uses `speak` field which contains the real current power level (0-10)
  - Fan speed now accurately reflects actual device operation in all modes
- **Auto Mode Detection**: Target fan state now properly detects and displays Auto mode
  - Added support for `curMode` field to detect current operating mode
  - Auto mode (`curMode: 3`) and VPD mode (`curMode: 8`) show as "Auto" in HomeKit
  - All other modes (On, Off, Timer, Cycle, Schedule) show as "Manual"
  - Target fan state updates automatically when device mode changes

### Added
- Enhanced debug logging with current power level and operating mode information
- New `PortMode` constants for better mode detection and future extensibility

### Technical Changes
- Added `CURRENT_MODE: 'curMode'` to `PortPropertyKey` constants
- Added `PortMode` enum with all supported AC Infinity modes
- Updated `getSpeed()` to use `speak` field instead of `loadState`
- Updated `getTargetState()` to properly detect Auto vs Manual modes
- Updated `updatePort()` to refresh both rotation speed and target fan state

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