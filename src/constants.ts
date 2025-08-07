export const MANUFACTURER = 'AC Infinity';
export const PLUGIN_NAME = 'homebridge-acinfinity';
export const PLATFORM_NAME = 'ACInfinity';

export const API_URL_LOGIN = '/api/user/appUserLogin';
export const API_URL_GET_DEVICE_INFO_LIST_ALL = '/api/user/devInfoListAll';
export const API_URL_GET_DEV_MODE_SETTING = '/api/dev/getdevModeSettingList';
export const API_URL_ADD_DEV_MODE = '/api/dev/addDevMode';
export const API_URL_GET_DEV_SETTING = '/api/dev/getDevSetting';
export const API_URL_UPDATE_ADV_SETTING = '/api/dev/updateAdvSetting';

export const SCHEDULE_DISABLED_VALUE = 65535;
export const SCHEDULE_MIDNIGHT_VALUE = 0;
export const SCHEDULE_EOD_VALUE = 1439;

export enum ControllerType {
  UIS_69_PRO = 11,
  UIS_69_PRO_PLUS = 18,
  UIS_89_AI_PLUS = 20,
}

export enum SensorType {
  PROBE_TEMPERATURE_F = 0,
  PROBE_TEMPERATURE_C = 1,
  PROBE_HUMIDITY = 2,
  PROBE_VPD = 3,
  CONTROLLER_TEMPERATURE_F = 4,
  CONTROLLER_TEMPERATURE_C = 5,
  CONTROLLER_HUMIDITY = 6,
  CONTROLLER_VPD = 7,
  SOIL = 10,
  CO2 = 11,
  LIGHT = 12,
  WATER = 20,
}

export const ControllerPropertyKey = {
  DEVICE_ID: 'devId',
  DEVICE_NAME: 'devName',
  MAC_ADDR: 'devMacAddr',
  DEVICE_INFO: 'deviceInfo',
  PORTS: 'ports',
  HW_VERSION: 'hardwareVersion',
  SW_VERSION: 'firmwareVersion',
  DEVICE_TYPE: 'devType',
  TEMPERATURE: 'temperature',
  HUMIDITY: 'humidity',
  VPD: 'vpdnums',
  ONLINE: 'online',
  TIME_ZONE: 'zoneId',
  SENSORS: 'sensors',
};

export const PortPropertyKey = {
  PORT: 'port',
  NAME: 'portName',
  SPEAK: 'speak',
  ONLINE: 'online',
  STATE: 'loadState',
  REMAINING_TIME: 'remainTime',
  CURRENT_MODE: 'curMode',
};

export const PortMode = {
  OFF: 1,
  ON: 2,
  AUTO: 3,
  TIMER_TO_ON: 4,
  TIMER_TO_OFF: 5,
  CYCLE: 6,
  SCHEDULE: 7,
  VPD: 8,
};

export const PortControlKey = {
  DEV_ID: 'devId',
  MODE_SET_ID: 'modeSetid',
  SURPLUS: 'surplus',
  ON_SPEED: 'onSpead',
  OFF_SPEED: 'offSpead',
  AT_TYPE: 'atType',
  SCHEDULED_START_TIME: 'schedStartTime',
  SCHEDULED_END_TIME: 'schedEndtTime',
  TIMER_DURATION_TO_ON: 'acitveTimerOn',
  TIMER_DURATION_TO_OFF: 'acitveTimerOff',
  CYCLE_DURATION_ON: 'activeCycleOn',
  CYCLE_DURATION_OFF: 'activeCycleOff',
  VPD_SETTINGS_MODE: 'vpdSettingMode',
  VPD_HIGH_ENABLED: 'activeHtVpd',
  VPD_HIGH_TRIGGER: 'activeHtVpdNums',
  VPD_LOW_ENABLED: 'activeLtVpd',
  VPD_LOW_TRIGGER: 'activeLtVpdNums',
  VPD_TARGET_ENABLED: 'targetVpdSwitch',
  VPD_TARGET: 'targetVpd',
  AUTO_SETTINGS_MODE: 'settingMode',
  AUTO_TEMP_HIGH_TRIGGER: 'devHt',
  AUTO_TEMP_HIGH_TRIGGER_F: 'devHtf',
  AUTO_TEMP_HIGH_ENABLED: 'activeHt',
  AUTO_HUMIDITY_HIGH_TRIGGER: 'devHh',
  AUTO_HUMIDITY_HIGH_ENABLED: 'activeHh',
  AUTO_TEMP_LOW_TRIGGER: 'devLt',
  AUTO_TEMP_LOW_TRIGGER_F: 'devLtf',
  AUTO_TEMP_LOW_ENABLED: 'activeLt',
  AUTO_HUMIDITY_LOW_TRIGGER: 'devLh',
  AUTO_HUMIDITY_LOW_ENABLED: 'activeLh',
  AUTO_TARGET_TEMP_ENABLED: 'targetTSwitch',
  AUTO_TARGET_TEMP: 'targetTemp',
  AUTO_TARGET_TEMP_F: 'targetTempF',
  AUTO_TARGET_HUMIDITY_ENABLED: 'targetHumiSwitch',
  AUTO_TARGET_HUMIDITY: 'targetHumi',
  VPD_STATUS: 'vpdstatus',
  VPD_NUMS: 'vpdnums',
  MASTER_PORT: 'masterPort',
  DEVICE_MAC_ADDR: 'devMacAddr',
  DEV_SETTING: 'devSetting',
  IPC_SETTING: 'ipcSetting',
};

export const AdvancedSettingsKey = {
  DEV_ID: 'devId',
  DEV_NAME: 'devName',
  TEMP_UNIT: 'devCompany',
  CALIBRATE_TEMP: 'devCt',
  CALIBRATE_TEMP_F: 'devCth',
  CALIBRATE_HUMIDITY: 'devCh',
  VPD_LEAF_TEMP_OFFSET: 'vpdCt',
  VPD_LEAF_TEMP_OFFSET_F: 'vpdCth',
  OUTSIDE_TEMP_COMPARE: 'tempCompare',
  OUTSIDE_HUMIDITY_COMPARE: 'humiCompare',
  DEVICE_LOAD_TYPE: 'loadType',
  DYNAMIC_RESPONSE_TYPE: 'isFlag',
  DYNAMIC_TRANSITION_TEMP: 'devTt',
  DYNAMIC_TRANSITION_TEMP_F: 'devTth',
  DYNAMIC_TRANSITION_HUMIDITY: 'devTh',
  DYNAMIC_TRANSITION_VPD: 'vpdTransition',
  DYNAMIC_BUFFER_TEMP: 'devBt',
  DYNAMIC_BUFFER_TEMP_F: 'devBth',
  DYNAMIC_BUFFER_HUMIDITY: 'devBh',
  DYNAMIC_BUFFER_VPD: 'devBvpd',
  SUNRISE_TIMER_ENABLED: 'onTimeSwitch',
  SUNRISE_TIMER_DURATION: 'onTime',
  CALIBRATION_TIME: 'calibrationTime',
  SENSOR_SETTING: 'sensorSetting',
  SENSOR_TRANS_BUFF: 'sensorTransBuff',
  SET_ID: 'setId',
  DEV_MAC_ADDR: 'devMacAddr',
  PORT_RESISTANCE: 'portResistance',
  DEV_TIME_ZONE: 'devTimeZone',
  PORT_PARAM_DATA: 'portParamData',
  SUB_DEVICE_VERSION: 'subDeviceVersion',
  SEC_FUC_REPORT_TIME: 'secFucReportTime',
  UPDATE_ALL_PORT: 'updateAllPort',
  SENSOR_TRANS_BUFF_STR: 'sensorTransBuffStr',
  SENSOR_SETTING_STR: 'sensorSettingStr',
  SENSOR_ONE_TYPE: 'sensorOneType',
  IS_SHARE: 'isShare',
  TARGET_VPD_SWITCH: 'targetVpdSwitch',
  SENSOR_TWO_TYPE: 'sensorTwoType',
  PARAM_SENSORS: 'paramSensors',
  ZONE_SENSOR_TYPE: 'zoneSensorType',
};

export const SensorPropertyKey = {
  ACCESS_PORT: 'accessPort',
  SENSOR_TYPE: 'sensorType',
  SENSOR_UNIT: 'sensorUnit',
  SENSOR_PRECISION: 'sensorPrecision',
  SENSOR_DATA: 'sensorData',
};