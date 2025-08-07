import axios, { AxiosInstance } from 'axios';
import { Agent } from 'http';
import { Agent as HttpsAgent } from 'https';
import { Logger } from 'homebridge';
import {
  API_URL_LOGIN,
  API_URL_GET_DEVICE_INFO_LIST_ALL,
  API_URL_GET_DEV_MODE_SETTING,
  API_URL_ADD_DEV_MODE,
  API_URL_GET_DEV_SETTING,
  API_URL_UPDATE_ADV_SETTING,
  PortControlKey,
  AdvancedSettingsKey,
} from '../constants';

export class ACInfinityClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ACInfinityClientError';
  }
}

export class ACInfinityClientCannotConnect extends ACInfinityClientError {
  constructor() {
    super('Cannot connect to AC Infinity API');
  }
}

export class ACInfinityClientInvalidAuth extends ACInfinityClientError {
  constructor() {
    super('Invalid authentication credentials');
  }
}

export class ACInfinityClientRequestFailed extends ACInfinityClientError {
  constructor(public response: any) {
    super(`Request failed: ${JSON.stringify(response)}`);
  }
}

export class ACInfinityClient {
  private readonly host: string;
  private readonly email: string;
  private readonly password: string;
  private userId: string | null = null;
  private readonly axios: AxiosInstance;
  private readonly debug: boolean;
  private lastRequestTime: number = 0;
  private readonly httpAgent: Agent;
  private readonly httpsAgent: HttpsAgent;

  constructor(host: string, email: string, password: string, private readonly log: Logger, debug = false) {
    this.host = host;
    this.email = email;
    this.password = password;
    this.debug = debug;
    
    // Create HTTP agents with proper keepalive like Home Assistant's aiohttp
    this.httpAgent = new Agent({
      keepAlive: true,
      maxSockets: 1, // Single connection per host like aiohttp ClientSession
      maxFreeSockets: 1,
      timeout: 60000, // Keep connections alive for 60s
    });
    
    this.httpsAgent = new HttpsAgent({
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
      // Enable proper session persistence like Home Assistant
      httpAgent: this.httpAgent,
      httpsAgent: this.httpsAgent,
      maxRedirects: 3,
      validateStatus: (status) => status < 500,
    });

    if (this.debug) {
      // Add request interceptor for debugging
      this.axios.interceptors.request.use(
        (config) => {
          this.log.debug(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
          this.log.debug(`[API Request Headers] ${JSON.stringify(config.headers)}`);
          if (config.data) {
            this.log.debug(`[API Request Body] ${config.data}`);
          }
          return config;
        },
        (error) => {
          this.log.debug(`[API Request Error] ${error.message}`);
          return Promise.reject(error);
        }
      );

      // Add response interceptor for debugging
      this.axios.interceptors.response.use(
        (response) => {
          this.log.debug(`[API Response] ${response.status} ${response.statusText}`);
          this.log.debug(`[API Response Data] ${JSON.stringify(response.data)}`);
          return response;
        },
        (error) => {
          if (error.response) {
            this.log.debug(`[API Response Error] ${error.response.status} ${error.response.statusText}`);
            this.log.debug(`[API Response Error Data] ${JSON.stringify(error.response.data)}`);
          } else {
            this.log.debug(`[API Response Error] ${error.message}`);
          }
          return Promise.reject(error);
        }
      );
    }
  }

  async login(): Promise<void> {
    try {
      // AC Infinity API does not accept passwords greater than 25 characters
      const normalizedPassword = this.password.substring(0, 25);

      const response = await this.axios.post(API_URL_LOGIN, new URLSearchParams({
        appEmail: this.email,
        appPasswordl: normalizedPassword, // Note: intentional typo in API
      }));

      if (response.data.code !== 200) {
        if (response.data.code === 10001) {
          throw new ACInfinityClientInvalidAuth();
        }
        throw new ACInfinityClientRequestFailed(response.data);
      }

      this.userId = response.data.data.appId;
      this.log.debug('Successfully logged in to AC Infinity API');
    } catch (error) {
      if (error instanceof ACInfinityClientError) {
        throw error;
      }
      this.handleHttpError(error, 'login');
    }
  }

  isLoggedIn(): boolean {
    return this.userId !== null;
  }

  private getAuthHeaders(): Record<string, string> {
    if (!this.userId) {
      throw new ACInfinityClientError('Client is not logged in');
    }
    return {
      token: this.userId,
      phoneType: '1',
      appVersion: '1.9.7',
      minversion: '3.5',
    };
  }

  async getDevicesListAll(): Promise<any[]> {
    if (!this.isLoggedIn()) {
      throw new ACInfinityClientError('AC Infinity client is not logged in');
    }

    try {
      const response = await this.axios.post(
        API_URL_GET_DEVICE_INFO_LIST_ALL,
        new URLSearchParams({ userId: this.userId! }),
        { headers: this.getAuthHeaders() }
      );

      if (response.data.code !== 200) {
        throw new ACInfinityClientRequestFailed(response.data);
      }

      return response.data.data;
    } catch (error) {
      if (error instanceof ACInfinityClientError) {
        throw error;
      }
      this.handleHttpError(error, 'getDeviceInfoListAll');
    }
  }

  async getDeviceModeSettingsList(deviceId: string | number, portId: number): Promise<any> {
    if (!this.isLoggedIn()) {
      throw new ACInfinityClientError('AC Infinity client is not logged in');
    }

    try {
      const response = await this.axios.post(
        API_URL_GET_DEV_MODE_SETTING,
        new URLSearchParams({
          devId: String(deviceId),
          port: String(portId),
        }),
        { headers: this.getAuthHeaders() }
      );

      if (response.data.code !== 200) {
        throw new ACInfinityClientRequestFailed(response.data);
      }

      return response.data.data;
    } catch (error) {
      if (error instanceof ACInfinityClientError) {
        throw error;
      }
      this.handleHttpError(error, 'getDeviceModeSettingsList');
    }
  }

  async setDeviceModeSettings(
    deviceId: string | number,
    portId: number,
    keyValues: Array<[string, number]>
  ): Promise<void> {
    if (this.debug) {
      this.log.debug(`[setDeviceModeSettings] Called with deviceId: ${deviceId}, portId: ${portId}`);
      this.log.debug(`[setDeviceModeSettings] Key-value pairs: ${JSON.stringify(keyValues)}`);
    }
    
    // Extract the speed value from keyValues (assumes only speed changes for now)
    let speed = 0;
    for (const [key, value] of keyValues) {
      if (key === PortControlKey.ON_SPEED || key === 'onSpead') {
        speed = value;
        break;
      }
    }

    if (this.debug) {
      this.log.debug(`[setDeviceModeSettings] Using official app format with speed: ${speed}`);
    }

    // Use the exact payload format from official AC Infinity app (from Charles capture)
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
      // NOTE: No modeSetid field - this matches official app behavior
    });
      
    if (this.debug) {
      this.log.debug(`[setDeviceModeSettings] Using official app payload format`);
    }

    try {
      const response = await this.axios.post(
        API_URL_ADD_DEV_MODE,
        params,
        { headers: this.getAuthHeaders() }
      );

      if (response.data.code !== 200) {
        throw new ACInfinityClientRequestFailed(response.data);
      }
      
      if (this.debug) {
        this.log.debug(`[setDeviceModeSettings] Successfully set speed to ${speed} using official app format`);
      }
    } catch (error) {
      if (error instanceof ACInfinityClientError) {
        throw error;
      }
      this.handleHttpError(error, 'setDeviceModeSettings');
    }
  }

  async getDeviceSettings(deviceId: string | number, port: number): Promise<any> {
    if (!this.isLoggedIn()) {
      throw new ACInfinityClientError('AC Infinity client is not logged in');
    }

    try {
      const response = await this.axios.post(
        API_URL_GET_DEV_SETTING,
        new URLSearchParams({
          devId: String(deviceId),
          port: String(port),
        }),
        { headers: this.getAuthHeaders() }
      );

      if (response.data.code !== 200) {
        throw new ACInfinityClientRequestFailed(response.data);
      }

      return response.data.data;
    } catch (error) {
      if (error instanceof ACInfinityClientError) {
        throw error;
      }
      this.handleHttpError(error, 'getDeviceSettings');
    }
  }

  async updateAdvancedSettings(
    deviceId: string | number,
    port: number,
    deviceName: string,
    keyValues: Array<[string, number]>
  ): Promise<void> {
    const settings = await this.getDeviceSettings(deviceId, port);

    // Set device name to prevent it being reset
    settings[AdvancedSettingsKey.DEV_NAME] = deviceName;

    // Remove fields not expected in update payload
    const fieldsToRemove = [
      AdvancedSettingsKey.SET_ID,
      AdvancedSettingsKey.DEV_MAC_ADDR,
      AdvancedSettingsKey.PORT_RESISTANCE,
      AdvancedSettingsKey.DEV_TIME_ZONE,
      AdvancedSettingsKey.SENSOR_SETTING,
      AdvancedSettingsKey.SENSOR_TRANS_BUFF,
      AdvancedSettingsKey.SUB_DEVICE_VERSION,
      AdvancedSettingsKey.SEC_FUC_REPORT_TIME,
      AdvancedSettingsKey.UPDATE_ALL_PORT,
      AdvancedSettingsKey.CALIBRATION_TIME,
    ];

    for (const key of fieldsToRemove) {
      delete settings[key];
    }

    // Handle string fields
    const stringFields = [
      AdvancedSettingsKey.SENSOR_TRANS_BUFF_STR,
      AdvancedSettingsKey.SENSOR_SETTING_STR,
      AdvancedSettingsKey.PORT_PARAM_DATA,
      AdvancedSettingsKey.PARAM_SENSORS,
    ];

    for (const key of stringFields) {
      if (!(key in settings) || settings[key] === null) {
        settings[key] = '';
      }
    }

    // Add default fields
    const defaultFields = [
      AdvancedSettingsKey.SENSOR_ONE_TYPE,
      AdvancedSettingsKey.IS_SHARE,
      AdvancedSettingsKey.TARGET_VPD_SWITCH,
      AdvancedSettingsKey.SENSOR_TWO_TYPE,
      AdvancedSettingsKey.ZONE_SENSOR_TYPE,
    ];

    for (const key of defaultFields) {
      if (!(key in settings)) {
        settings[key] = 0;
      }
    }

    // Convert string ID to number
    settings[AdvancedSettingsKey.DEV_ID] = parseInt(settings[AdvancedSettingsKey.DEV_ID]);

    // Set null values to 0
    for (const key in settings) {
      if (settings[key] === null || settings[key] === undefined) {
        settings[key] = 0;
      }
    }

    // Apply user changes
    for (const [key, value] of keyValues) {
      settings[key] = value;
    }

    try {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(settings)) {
        params.append(key, String(value));
      }

      const response = await this.axios.post(
        API_URL_UPDATE_ADV_SETTING,
        params,
        { headers: this.getAuthHeaders() }
      );

      if (response.data.code !== 200) {
        throw new ACInfinityClientRequestFailed(response.data);
      }
    } catch (error) {
      if (error instanceof ACInfinityClientError) {
        throw error;
      }
      this.handleHttpError(error, 'updateAdvancedSettings');
    }
  }

  private async throttleRequest(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minInterval = 1500; // Minimum 1.5 seconds between API calls
    
    if (timeSinceLastRequest < minInterval) {
      const delayMs = minInterval - timeSinceLastRequest;
      if (this.debug) {
        this.log.debug(`[API Throttle] Waiting ${delayMs}ms before next request`);
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Cleanup method to properly dispose of HTTP connections and clear auth state
   * Should be called when the plugin is shutting down or reconnecting
   */
  async cleanup(): Promise<void> {
    try {
      if (this.debug) {
        this.log.debug('[Cleanup] Disposing of HTTP client and clearing auth state');
      }
      
      // Clear authentication state
      this.userId = null;
      this.lastRequestTime = 0;
      
      // Clear axios interceptors to prevent memory leaks
      this.axios.interceptors.request.clear();
      this.axios.interceptors.response.clear();
      
      // Properly close HTTP agents and their connection pools
      this.httpAgent.destroy();
      this.httpsAgent.destroy();
      
    } catch (error) {
      this.log.warn('Error during client cleanup:', error);
    }
  }

  /**
   * Enhanced error handling with connection recovery
   */
  private handleHttpError(error: any, context: string): never {
    if (error.code === 'ECONNRESET' || error.code === 'ECONNREFUSED') {
      this.log.error(`[${context}] Connection error: ${error.code} - ${error.message}`);
      throw new ACInfinityClientCannotConnect();
    } else if (error.code === 'ETIMEDOUT') {
      this.log.error(`[${context}] Request timeout - API may be overloaded`);
      throw new ACInfinityClientCannotConnect();
    } else if (error.response?.status >= 500) {
      this.log.error(`[${context}] Server error ${error.response.status} - ${error.response.statusText}`);
      throw new ACInfinityClientCannotConnect();
    } else {
      this.log.error(`[${context}] HTTP error:`, error.message);
      throw new ACInfinityClientCannotConnect();
    }
  }
}