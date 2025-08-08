# AC Infinity API Reference

This document provides technical details about the AC Infinity API integration used by this Homebridge plugin. It covers the API endpoints, payload formats, and controller-specific approaches discovered through reverse engineering.

## API Base URL

```
http://www.acinfinityserver.com
```

## Authentication

The API uses simple token-based authentication:

1. Login with email/password to get a user token
2. Include token in subsequent requests via the `token` header

### Login Request

```http
POST /api/user/appUserLogin
Content-Type: application/x-www-form-urlencoded

appEmail=user@example.com&appPasswordl=password123
```

**Note**: The API parameter is `appPasswordl` (with 'l') - this is intentional and matches the official API.

**Password Limitation**: API only accepts first 25 characters of password.

### Login Response

```json
{
  "msg": "success.",
  "code": 200,
  "data": {
    "appId": "1234567890123456789",
    "nickName": "user@example.com",
    "appEmail": "user@example.com"
  }
}
```

The `appId` is used as the authentication token for subsequent requests.

## Core Endpoints

### Get Device List

```http
POST /api/user/devInfoListAll
Content-Type: application/x-www-form-urlencoded

userId=1234567890123456789
```

Headers:
```
token: 1234567890123456789
phoneType: 1
appVersion: 1.9.7
```

### Get Device Mode Settings

```http
POST /api/dev/getdevModeSettingList
Content-Type: application/x-www-form-urlencoded

devId=1234567890123456789&port=2
```

Headers:
```
token: 1234567890123456789
phoneType: 1
appVersion: 1.9.7
minversion: 3.5
```

### Set Device Mode (Fan Control)

```http
POST /api/dev/addDevMode
Content-Type: application/x-www-form-urlencoded

[See Controller-Specific Payloads below]
```

## Controller Types

AC Infinity manufactures different controller types that require different API approaches:

### UIS 89 AI+ (Type 20)
- **Device Type**: 20
- **newFrameworkDevice**: true
- **API Approach**: Hardcoded static payload
- **User-Agent**: `ACController/1.9.7 (com.acinfinity.humiture; build:533; iOS 18.5.0) Alamofire/5.10.2`

### UIS 69 PRO (Type 11)  
- **Device Type**: 11
- **newFrameworkDevice**: false
- **API Approach**: Static payload with real device settings
- **User-Agent**: `ACController/1.9.7 (com.acinfinity.humiture; build:533; iOS 18.5.0) Alamofire/5.10.2`

### UIS 69 PRO+ (Type 18)
- **Device Type**: 18  
- **newFrameworkDevice**: false
- **API Approach**: Static payload with real device settings
- **User-Agent**: `ACController/1.9.7 (com.acinfinity.humiture; build:533; iOS 18.5.0) Alamofire/5.10.2`

## Controller-Specific Payloads

### UIS 89 AI+ (Hardcoded Static Payload)

For newer controllers, use a static payload with hardcoded values:

```http
POST /api/dev/addDevMode
Content-Type: application/x-www-form-urlencoded

acitveTimerOff=0&acitveTimerOn=0&activeCycleOff=0&activeCycleOn=0&activeHh=0&activeHt=0&activeHtVpd=0&activeHtVpdNums=0&activeLh=0&activeLt=0&activeLtVpd=0&activeLtVpdNums=0&atType=2&co2FanHighSwitch=0&co2FanHighValue=0&co2LowSwitch=0&co2LowValue=0&devHh=0&devHt=0&devHtf=32&devId=1234567890123456789&devLh=0&devLt=0&devLtf=32&devMacAddr=&ecOrTds=0&ecTdsLowSwitchEc=0&ecTdsLowSwitchTds=0&ecTdsLowValueEcMs=1&ecTdsLowValueEcUs=0&ecTdsLowValueTdsPpm=0&ecTdsLowValueTdsPpt=1&ecUnit=0&externalPort=1&hTrend=0&humidity=0&isOpenAutomation=0&masterPort=0&modeType=0&moistureLowSwitch=0&moistureLowValue=0&offSpead=0&onSelfSpead=7&onSpead=7&onlyUpdateSpeed=0&phHighSwitch=0&phHighValue=0&phLowSwitch=0&phLowValue=0&schedEndtTime=65535&schedStartTime=65535&settingMode=0&speak=0&surplus=0&tTrend=0&targetHumi=0&targetHumiSwitch=0&targetTSwitch=0&targetTemp=0&targetTempF=32&targetVpd=0&targetVpdSwitch=0&tdsUnit=0&temperature=0&temperatureF=0&trend=0&unit=0&vpdSettingMode=0&waterLevelLowSwitch=0&waterTempHighSwitch=0&waterTempHighValue=0&waterTempHighValueF=32&waterTempLowSwitch=0&waterTempLowValue=0&waterTempLowValueF=32
```

Headers:
```
token: 1234567890123456789
phoneType: 1
appVersion: 1.9.7
minversion: 3.5
```

### UIS 69 PRO (Static Payload with Real Settings)

For older controllers, first fetch current settings, then send them in static payload format:

1. **Fetch Current Settings** (as shown above)

2. **Send Static Payload** with real values:

```http
POST /api/dev/addDevMode
Content-Type: application/x-www-form-urlencoded

acitveTimerOff=[REAL_VALUE]&acitveTimerOn=[REAL_VALUE]&activeCycleOff=[REAL_VALUE]&...&onSpead=7&...
```

Headers:
```
token: 1234567890123456789
phoneType: 1
appVersion: 1.9.7
```

**Critical Differences**:
- Populate payload with actual device settings (not zeros)
- **Omit the `modeSetid` field** (this causes 403 errors)
- Only change the `onSpead` parameter to set fan speed
- Keep all other values as retrieved from current settings

## Key API Fields

### Fan Speed Control
- **onSpead**: Target fan speed (0-10)
- **speak**: Current fan power level (0-10, read-only)
- **onSelfSpead**: Self-regulating speed setting

### Device Information  
- **devId**: Device identifier
- **externalPort**: Port number (1-8 depending on controller)
- **devType**: Controller type (11=UIS 69 PRO, 20=UIS 89 AI+, 18=UIS 69 PRO+)
- **newFrameworkDevice**: Boolean indicating API approach needed

### Environmental Data
- **temperature**: Temperature (×100, e.g., 2366 = 23.66°C)
- **humidity**: Humidity (×100, e.g., 5118 = 51.18%)
- **vpdnums**: VPD value (×100, e.g., 143 = 1.43 kPa)

### Mode Detection
- **curMode**: Current operating mode
  - `1` = OFF
  - `2` = ON (Manual)  
  - `3` = AUTO
  - `8` = VPD

### Port Status
- **online**: Port connection status (0/1)
- **loadState**: Load detection (0/1)
- **portResistance**: Port resistance reading

## Error Codes

- **200**: Success
- **403**: "Data saving failed" (rate limiting or invalid payload)
- **404**: Endpoint not found
- **500**: Invalid credentials
- **10001**: Authentication failed
- **100001**: Generic request error
- **999999**: Operation failed (usually unsupported controller)

## Rate Limiting

The API implements connection-based rate limiting:
- Multiple requests from different connections are treated as different clients
- Use persistent HTTP connections (keepalive) to avoid rate limits
- Implement request queuing with reasonable delays (500ms between requests)

## Network Analysis

This API documentation was created through:

1. **Charles Proxy Analysis**: Captured official AC Infinity iPhone app network traffic
2. **Home Assistant Integration**: Analyzed working Home Assistant plugin implementation  
3. **Live Testing**: Tested with actual UIS 69 PRO and UIS 89 AI+ hardware
4. **Reverse Engineering**: Discovered controller-specific approaches through trial and error

## Security Notes

⚠️ **Important Security Considerations**:

- API credentials (email/password) are transmitted in plain text
- Authentication tokens have no visible expiration
- All API communication happens over HTTP (not HTTPS)
- This API is intended for local network use with AC Infinity controllers
- Never expose API credentials in public repositories or logs

## Implementation Notes

### HTTP Client Configuration

```javascript
const axios = axios.create({
  baseURL: 'http://www.acinfinityserver.com',
  timeout: 15000,
  headers: {
    'User-Agent': 'ACController/1.9.7 (com.acinfinity.humiture; build:533; iOS 18.5.0) Alamofire/5.10.2',
    'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
  },
  httpAgent: new Agent({ keepAlive: true, maxSockets: 1 }),
  httpsAgent: new HttpsAgent({ keepAlive: true, maxSockets: 1 }),
  maxRedirects: 3,
  validateStatus: (status) => status < 500,
});
```

### Controller Detection

```javascript
function isNewFrameworkDevice(deviceType, deviceData) {
  // AI+ controllers use hardcoded static payload
  if (deviceType === 20) return true;
  
  // Check explicit framework flag
  if (deviceData?.newFrameworkDevice === true) return true;
  if (deviceData?.newFrameworkDevice === false) return false;
  
  // Default: older controllers use real settings approach
  return false;
}
```

### Error Handling

```javascript
if (response.data.code === 403) {
  // Rate limited or invalid payload
  // For UIS 69 PRO: try iPhone app approach
  // For UIS 89 AI+: verify static payload format
}

if (response.data.code === 999999) {
  // Unsupported controller or wrong API approach
  // Switch between hardcoded vs real settings method
}
```

## Testing

A comprehensive test CLI application is included (`test-api.js`) that:
- Auto-detects controller types
- Uses appropriate API approach for each controller
- Includes fallback logic for unknown devices
- Provides detailed logging for debugging

Usage:
```bash
node test-api.js http://www.acinfinityserver.com email@example.com password123 devices
node test-api.js http://www.acinfinityserver.com email@example.com password123 speed DEVICE_ID PORT_ID SPEED
```

---

*This documentation reflects the current understanding of the AC Infinity API as of August 2025. The API may change without notice as it's not officially documented by AC Infinity.*