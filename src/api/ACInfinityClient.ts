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
        'User-Agent': 'ACController/1.8.2 (com.acinfinity.humiture; build:489; iOS 16.5.1) Alamofire/5.4.4',
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
    
    const settings = await this.getDeviceModeSettingsList(deviceId, portId);
    
    if (this.debug) {
      this.log.debug(`[setDeviceModeSettings] Current settings before modification: ${JSON.stringify(settings)}`);
    }

    // Remove fields that are not part of update payload
    const fieldsToRemove = [
      PortControlKey.DEVICE_MAC_ADDR,
      PortControlKey.IPC_SETTING,
      PortControlKey.DEV_SETTING,
    ];
    
    for (const key of fieldsToRemove) {
      delete settings[key];
    }

    // Add defaulted fields
    const defaultFields = [
      PortControlKey.VPD_STATUS,
      PortControlKey.VPD_NUMS,
    ];
    
    for (const key of defaultFields) {
      if (!(key in settings)) {
        settings[key] = 0;
      }
    }

    // Convert string IDs to numbers
    settings[PortControlKey.DEV_ID] = parseInt(settings[PortControlKey.DEV_ID]);
    settings[PortControlKey.MODE_SET_ID] = parseInt(settings[PortControlKey.MODE_SET_ID]);

    // Apply user changes
    for (const [key, value] of keyValues) {
      settings[key] = value;
    }

    // Set null values to 0
    for (const key in settings) {
      if (settings[key] === null || settings[key] === undefined) {
        settings[key] = 0;
      }
    }

    if (this.debug) {
      this.log.debug(`[setDeviceModeSettings] Final settings to be sent: ${JSON.stringify(settings)}`);
    }

    try {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(settings)) {
        params.append(key, String(value));
      }
      
      if (this.debug) {
        this.log.debug(`[setDeviceModeSettings] Request params: ${params.toString()}`);
      }

      const response = await this.axios.post(
        API_URL_ADD_DEV_MODE,
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