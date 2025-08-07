#!/usr/bin/env node

const axios = require('axios');
const { Agent } = require('http');
const { Agent: HttpsAgent } = require('https');

// AC Infinity API endpoints
const API_URL_LOGIN = '/api/user/appUserLogin';
const API_URL_GET_DEVICE_INFO_LIST_ALL = '/api/user/devInfoListAll';
const API_URL_ADD_DEV_MODE = '/api/dev/addDevMode';

class ACInfinityTest {
  constructor(host, email, password, debug = true) {
    this.host = host;
    this.email = email;
    this.password = password;
    this.debug = debug;
    this.userId = null;
    
    // Create HTTP agents with keepalive like v1.2.8
    const httpAgent = new Agent({
      keepAlive: true,
      maxSockets: 1,
      maxFreeSockets: 1,
      timeout: 60000,
    });
    
    const httpsAgent = new HttpsAgent({
      keepAlive: true,
      maxSockets: 1,
      maxFreeSockets: 1,
      timeout: 60000,
    });

    this.axios = axios.create({
      baseURL: host,
      timeout: 15000,
      headers: {
        'User-Agent': 'ACController/1.9.7 (com.acinfinity.humiture; build:533; iOS 18.5.0) Alamofire/5.10.2',
        'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
      },
      httpAgent: httpAgent,
      httpsAgent: httpsAgent,
      maxRedirects: 3,
      validateStatus: (status) => status < 500,
    });

    if (this.debug) {
      this.axios.interceptors.request.use(
        (config) => {
          console.log(`[REQUEST] ${config.method?.toUpperCase()} ${config.url}`);
          if (config.data) {
            console.log(`[REQUEST BODY] ${config.data}`);
          }
          return config;
        }
      );

      this.axios.interceptors.response.use(
        (response) => {
          console.log(`[RESPONSE] ${response.status} ${response.statusText}`);
          console.log(`[RESPONSE BODY] ${JSON.stringify(response.data)}`);
          return response;
        },
        (error) => {
          if (error.response) {
            console.log(`[ERROR] ${error.response.status} ${error.response.statusText}`);
            console.log(`[ERROR BODY] ${JSON.stringify(error.response.data)}`);
          } else {
            console.log(`[ERROR] ${error.message}`);
          }
          return Promise.reject(error);
        }
      );
    }
  }

  async login() {
    console.log('\n=== TESTING LOGIN ===');
    const normalizedPassword = this.password.substring(0, 25);
    
    const response = await this.axios.post(API_URL_LOGIN, new URLSearchParams({
      appEmail: this.email,
      appPasswordl: normalizedPassword, // Note: intentional typo in API
    }));

    if (response.data.code !== 200) {
      throw new Error(`Login failed: ${JSON.stringify(response.data)}`);
    }

    this.userId = response.data.data.appId;
    console.log('✅ Login successful');
    return this.userId;
  }

  async getDevices() {
    console.log('\n=== TESTING GET DEVICES ===');
    const response = await this.axios.post(
      API_URL_GET_DEVICE_INFO_LIST_ALL,
      new URLSearchParams({ userId: this.userId }),
      { headers: { token: this.userId } }
    );

    if (response.data.code !== 200) {
      throw new Error(`Get devices failed: ${JSON.stringify(response.data)}`);
    }

    console.log('✅ Get devices successful');
    return response.data.data;
  }

  async setFanSpeedOfficial(deviceId, portId, speed) {
    console.log(`\n=== TESTING OFFICIAL APP APPROACH (Device: ${deviceId}, Port: ${portId}, Speed: ${speed}) ===`);
    
    // Exact payload format from Charles capture (official app)
    const params = new URLSearchParams({
      acitveTimerOff: '0',
      acitveTimerOn: '0',
      activeCycleOff: '0',
      activeCycleOn: '0',
      activeHh: '0',
      activeHt: '0',
      activeHtVpd: '0',
      activeHtVpdNums: '0',
      activeLh: '0',
      activeLt: '0',
      activeLtVpd: '0',
      activeLtVpdNums: '0',
      atType: '2',
      co2FanHighSwitch: '0',
      co2FanHighValue: '0',
      co2LowSwitch: '0',
      co2LowValue: '0',
      devHh: '0',
      devHt: '0',
      devHtf: '32',
      devId: String(deviceId),
      devLh: '0',
      devLt: '0',
      devLtf: '32',
      devMacAddr: '',
      ecOrTds: '0',
      ecTdsLowSwitchEc: '0',
      ecTdsLowSwitchTds: '0',
      ecTdsLowValueEcMs: '1',
      ecTdsLowValueEcUs: '0',
      ecTdsLowValueTdsPpm: '0',
      ecTdsLowValueTdsPpt: '1',
      ecUnit: '0',
      externalPort: String(portId),
      hTrend: '0',
      humidity: '0',
      isOpenAutomation: '0',
      masterPort: '0',
      modeType: '0',
      moistureLowSwitch: '0',
      moistureLowValue: '0',
      offSpead: '0',
      onSelfSpead: '9',
      onSpead: String(speed), // The actual speed we want to set
      onlyUpdateSpeed: '0',
      phHighSwitch: '0',
      phHighValue: '0',
      phLowSwitch: '0',
      phLowValue: '0',
      schedEndtTime: '65535',
      schedStartTime: '65535',
      settingMode: '0',
      speak: '0',
      surplus: '0',
      tTrend: '0',
      targetHumi: '0',
      targetHumiSwitch: '0',
      targetTSwitch: '0',
      targetTemp: '0',
      targetTempF: '32',
      targetVpd: '0',
      targetVpdSwitch: '0',
      tdsUnit: '0',
      temperature: '0',
      temperatureF: '0',
      trend: '0',
      unit: '0',
      vpdSettingMode: '0',
      waterLevelLowSwitch: '0',
      waterTempHighSwitch: '0',
      waterTempHighValue: '0',
      waterTempHighValueF: '32',
      waterTempLowSwitch: '0',
      waterTempLowValue: '0',
      waterTempLowValueF: '32'
      // NOTE: NO modeSetid field - this is the key difference!
    });

    console.log(`Sending official app format request...`);
    
    const response = await this.axios.post(
      API_URL_ADD_DEV_MODE,
      params,
      { 
        headers: { 
          token: this.userId,
          phoneType: '1',
          appVersion: '1.9.7',
          minversion: '3.5' // Official app includes this for addDevMode
        } 
      }
    );

    if (response.data.code !== 200) {
      throw new Error(`Official app format failed: ${JSON.stringify(response.data)}`);
    }

    console.log(`✅ Official app format fan speed set to ${speed} successfully`);
    return response.data;
  }

  async setFanSpeedMinimal(deviceId, portId, speed) {
    console.log(`\n=== TESTING MINIMAL SET FAN SPEED (Device: ${deviceId}, Port: ${portId}, Speed: ${speed}) ===`);
    
    // Try a much simpler approach - just send the bare minimum
    const params = new URLSearchParams({
      devId: String(deviceId),
      externalPort: String(portId),
      onSpead: String(speed)
    });

    console.log(`Sending minimal speed change request...`);
    
    const response = await this.axios.post(
      API_URL_ADD_DEV_MODE,
      params,
      { headers: { token: this.userId } }
    );

    if (response.data.code !== 200) {
      throw new Error(`Minimal set speed failed: ${JSON.stringify(response.data)}`);
    }

    console.log(`✅ Minimal fan speed set to ${speed} successfully`);
    return response.data;
  }

  async setFanSpeed(deviceId, portId, speed) {
    console.log(`\n=== TESTING SET FAN SPEED (Device: ${deviceId}, Port: ${portId}, Speed: ${speed}) ===`);
    
    // First try the official app approach (from Charles capture)
    try {
      return await this.setFanSpeedOfficial(deviceId, portId, speed);
    } catch (error) {
      console.log(`Official app approach failed: ${error.message}`);
    }
    
    // Then try the minimal approach
    try {
      return await this.setFanSpeedMinimal(deviceId, portId, speed);
    } catch (error) {
      console.log(`Minimal approach failed: ${error.message}`);
    }

    // First get current settings (like Homebridge does)
    const getCurrentSettings = await this.axios.post(
      '/api/dev/getdevModeSettingList',
      new URLSearchParams({
        devId: String(deviceId),
        port: String(portId),
      }),
      { headers: { token: this.userId } }
    );

    if (getCurrentSettings.data.code !== 200) {
      throw new Error(`Get settings failed: ${JSON.stringify(getCurrentSettings.data)}`);
    }

    const settings = getCurrentSettings.data.data;
    console.log(`Current settings retrieved for port ${portId} - current speed: ${settings.onSpead}`);

    // EXACT Home Assistant approach:
    // 1. Remove fields that are not part of update payload
    delete settings.devMacAddr;
    delete settings.ipcSetting; 
    delete settings.devSetting;
    
    // 2. Add defaulted fields if missing
    settings.vpdstatus = settings.vpdstatus || 0;
    settings.vpdnums = settings.vpdnums || 0;
    
    // 3. Convert string IDs to integers (CRITICAL!)
    settings.devId = parseInt(settings.devId);
    settings.modeSetid = parseInt(settings.modeSetid);
    
    // 4. Set the new speed
    settings.onSpead = speed;
    
    // 5. Convert None values to 0
    for (const key in settings) {
      if (settings[key] === null || settings[key] === undefined) {
        settings[key] = 0;
      }
    }

    console.log(`Sending speed change request with HA approach...`);
    
    // Send the update
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(settings)) {
      params.append(key, String(value));
    }

    const response = await this.axios.post(
      API_URL_ADD_DEV_MODE,
      params,
      { headers: { token: this.userId } }
    );

    if (response.data.code !== 200) {
      throw new Error(`Set speed failed: ${JSON.stringify(response.data)}`);
    }

    console.log(`✅ Fan speed set to ${speed} successfully`);
    return response.data;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  if (args.length < 4) {
    console.log('Usage: node test-api.js <host> <email> <password> <command> [device_id] [port_id] [speed]');
    console.log('Commands: login, devices, speed');
    console.log('Example: node test-api.js http://www.acinfinityserver.com keith@hadm.net password123 speed 12345 1 5');
    process.exit(1);
  }

  const [host, email, password, command] = args;
  const client = new ACInfinityTest(host, email, password);

  try {
    console.log('🚀 Starting AC Infinity API Test');
    console.log(`Host: ${host}`);
    console.log(`Email: ${email}`);
    console.log(`Command: ${command}`);

    // Always login first
    await client.login();

    if (command === 'login') {
      console.log('\n✅ Login test completed successfully');
    } else if (command === 'devices') {
      const devices = await client.getDevices();
      console.log(`\n📱 Found ${devices.length} device(s)`);
      devices.forEach((device, i) => {
        console.log(`Device ${i + 1}: ${device.devName} (ID: ${device.devId})`);
        const deviceInfo = device.deviceInfo;
        if (deviceInfo && deviceInfo.ports) {
          deviceInfo.ports.forEach(port => {
            console.log(`  Port ${port.port}: ${port.portName || 'Unnamed'} (Online: ${port.online}, State: ${port.loadState})`);
          });
        }
      });
    } else if (command === 'speed') {
      if (args.length < 7) {
        console.log('Speed command requires: device_id port_id speed');
        process.exit(1);
      }
      const deviceId = args[4];
      const portId = parseInt(args[5]);
      const speed = parseInt(args[6]);
      
      await client.setFanSpeed(deviceId, portId, speed);
    } else {
      console.log(`Unknown command: ${command}`);
      process.exit(1);
    }

    console.log('\n🎉 Test completed successfully');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}