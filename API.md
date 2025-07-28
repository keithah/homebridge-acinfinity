# AC Infinity API Documentation

This document describes the AC Infinity cloud API used by their mobile app and this Homebridge plugin.

## Base URL
```
http://www.acinfinityserver.com
```

## Authentication

### Login
**Endpoint:** `POST /api/user/appUserLogin`

**Headers:**
```
User-Agent: ACController/1.8.2 (com.acinfinity.humiture; build:489; iOS 16.5.1) Alamofire/5.4.4
Content-Type: application/x-www-form-urlencoded; charset=utf-8
```

**Request Body:**
```
appEmail=your-email@example.com&appPasswordl=your-password
```

**Note:** The API parameter is `appPasswordl` (with an 'l'), not `appPassword`. This appears to be a typo in the AC Infinity API but must be used exactly as shown.

**Password Limitation:** Passwords are truncated to 25 characters by the API.

**Response:**
```json
{
  "msg": "success.",
  "code": 200,
  "data": {
    "appId": "1917675300271620097",
    "nickName": "your-email@example.com",
    "appEmail": "your-email@example.com",
    "appPasswordl": "*",
    "appUsable": 1,
    "forumUsable": 1,
    "forumRole": 0,
    "appCreateTime": "2025-04-30 20:19:55",
    "appIsanalytics": 1,
    "appIsbugreport": 1,
    "appIsemailrepost": 1,
    "createTime": null,
    "trackBlacklist": null
  }
}
```

The `appId` from the response is used as the authentication token for subsequent requests.

## Device Management

### Get All Devices
**Endpoint:** `POST /api/user/devInfoListAll`

**Headers:**
```
User-Agent: ACController/1.8.2 (com.acinfinity.humiture; build:489; iOS 16.5.1) Alamofire/5.4.4
Content-Type: application/x-www-form-urlencoded; charset=utf-8
token: {appId from login response}
```

**Request Body:**
```
userId={appId from login response}
```

**Response:**
```json
{
  "msg": "success.",
  "code": 200,
  "data": [
    {
      "devId": "1424979258063493485",
      "devCode": "UJJCP",
      "devName": "Closet Fan",
      "devType": 20,
      "devAccesstime": 1753633943,
      "devPortCount": 8,
      "devOfftime": 1753633940,
      "devMacAddr": "E80690D1428E",
      "devVersion": 10,
      "online": 1,
      "isShare": 0,
      "deviceInfo": {
        "devMacAddr": "E80690D1428E",
        "devId": 1424979258063493485,
        "temperature": 2439,
        "temperatureF": 7590,
        "humidity": 4940,
        "ports": [
          {
            "speak": 4,
            "port": 1,
            "curMode": 2,
            "online": 1,
            "portName": "Fan in attic",
            "portResistance": 5100,
            "loadType": 0,
            "loadState": 1,
            "abnormalState": 0,
            "overcurrentStatus": 0
          }
        ],
        "sensors": [
          {
            "sensorType": 0,
            "sensorUnit": 0,
            "sensorPrecision": 3,
            "sensorTrend": 1,
            "accessPort": 1,
            "sensorData": 6800,
            "sensorKey": "0-1"
          }
        ]
      },
      "firmwareVersion": "12.7.21",
      "hardwareVersion": "1.1"
    }
  ]
}
```

## Port Control

### Get Port Settings
**Endpoint:** `POST /api/dev/getdevModeSettingList`

**Headers:**
```
User-Agent: ACController/1.8.2 (com.acinfinity.humiture; build:489; iOS 16.5.1) Alamofire/5.4.4
Content-Type: application/x-www-form-urlencoded; charset=utf-8
token: {appId from login response}
```

**Request Body:**
```
devId={device_id}&port={port_number}
```

### Update Port Settings
**Endpoint:** `POST /api/dev/addDevMode`

**Headers:**
```
User-Agent: ACController/1.8.2 (com.acinfinity.humiture; build:489; iOS 16.5.1) Alamofire/5.4.4
Content-Type: application/x-www-form-urlencoded; charset=utf-8
token: {appId from login response}
```

**Request Body:** Contains all port settings (retrieved from getdevModeSettingList and modified)

### Get Device Settings
**Endpoint:** `POST /api/dev/getDevSetting`

**Headers:**
```
User-Agent: ACController/1.8.2 (com.acinfinity.humiture; build:489; iOS 16.5.1) Alamofire/5.4.4
Content-Type: application/x-www-form-urlencoded; charset=utf-8
token: {appId from login response}
```

**Request Body:**
```
devId={device_id}&port={port_number}
```

### Update Advanced Settings
**Endpoint:** `POST /api/dev/updateAdvSetting`

**Headers:**
```
User-Agent: ACController/1.8.2 (com.acinfinity.humiture; build:489; iOS 16.5.1) Alamofire/5.4.4
Content-Type: application/x-www-form-urlencoded; charset=utf-8
token: {appId from login response}
```

## Data Structure Reference

### Device Types
- `11`: UIS Controller 69 Pro  
- `18`: UIS Controller 69 Pro+
- `20`: UIS Controller 89 AI+

### Temperature & Humidity Values
Temperature and humidity values are returned as integers multiplied by 100:
- `temperature: 2439` = 24.39°C
- `humidity: 4940` = 49.40%

### Port States
- `loadState: 0` = Off
- `loadState: 1` = On
- `online: 0` = Port offline/unused
- `online: 1` = Port online/active

### Fan Speed
- `speak`: Fan speed value (0-10 scale)
- Speed 0 = Off
- Speed 10 = Maximum

### Sensor Types
- `0`: Probe Temperature (Fahrenheit)
- `1`: Probe Temperature (Celsius) 
- `2`: Probe Humidity
- `3`: Probe VPD (Vapor Pressure Deficit)
- `4`: Controller Temperature (Fahrenheit)
- `5`: Controller Temperature (Celsius)
- `6`: Controller Humidity
- `7`: Controller VPD
- `10`: Soil Sensor
- `11`: CO2 Sensor
- `12`: Light Sensor
- `20`: Water Sensor

### Sensor Data
Sensor readings are also multiplied by a factor (usually 100) and need to be divided:
- `sensorData: 6800` for temperature = 68.00°F
- `sensorData: 6090` for humidity = 60.90%

## Error Handling

### Response Codes
- `200`: Success
- `10001`: Invalid authentication (wrong email/password)
- Other codes indicate various API errors

### Error Response Format
```json
{
  "msg": "error message",
  "code": 10001,
  "data": null
}
```

## Usage Notes

1. **Rate Limiting:** The API appears to have rate limiting. Recommended polling interval is 10+ seconds.

2. **Session Management:** The `appId` token appears to be long-lived but may expire. Implement re-authentication on auth errors.

3. **Data Consistency:** Always fetch current settings before updating to avoid overwriting other concurrent changes.

4. **Port Management:** Only attempt to control ports that are `online: 1`. Offline ports should be ignored.

5. **Value Scaling:** Remember to divide temperature/humidity values by 100 and sensor data by appropriate factors.

## Example Implementation

See the `ACInfinityClient.ts` file in this project for a complete TypeScript implementation of this API.