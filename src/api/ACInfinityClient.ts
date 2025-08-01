import axios, { AxiosInstance } from 'axios';
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

  constructor(host: string, email: string, password: string, private readonly log: Logger) {
    this.host = host;
    this.email = email;
    this.password = password;
    
    this.axios = axios.create({
      baseURL: host,
      timeout: 10000,
      headers: {
        'User-Agent': 'ACController/1.8.2 (com.acinfinity.humiture; build:489; iOS 16.5.1) Alamofire/5.4.4',
        'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
      },
    });
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
      this.log.error('Login error:', error);
      throw new ACInfinityClientCannotConnect();
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
      this.log.error('Get devices error:', error);
      throw new ACInfinityClientCannotConnect();
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
      this.log.error('Get device mode settings error:', error);
      throw new ACInfinityClientCannotConnect();
    }
  }

  async setDeviceModeSettings(
    deviceId: string | number,
    portId: number,
    keyValues: Array<[string, number]>
  ): Promise<void> {
    const settings = await this.getDeviceModeSettingsList(deviceId, portId);

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

    try {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(settings)) {
        params.append(key, String(value));
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
      this.log.error('Set device mode settings error:', error);
      throw new ACInfinityClientCannotConnect();
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
      this.log.error('Get device settings error:', error);
      throw new ACInfinityClientCannotConnect();
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
      this.log.error('Update advanced settings error:', error);
      throw new ACInfinityClientCannotConnect();
    }
  }
}