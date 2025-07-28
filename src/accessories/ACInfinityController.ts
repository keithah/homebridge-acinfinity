import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { ACInfinityPlatform } from '../platform';
import { ControllerPropertyKey, PortPropertyKey, PortControlKey, SensorPropertyKey, SensorType, MANUFACTURER } from '../constants';

export class ACInfinityController {
  private readonly deviceId: string;
  private readonly informationService: Service;
  private temperatureService?: Service;
  private humidityService?: Service;
  private readonly portServices: Map<number, Service> = new Map();
  
  constructor(
    private readonly platform: ACInfinityPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    this.deviceId = accessory.context.device[ControllerPropertyKey.DEVICE_ID];
    
    // Set accessory information
    this.informationService = this.accessory.getService(this.platform.Service.AccessoryInformation)!;
    
    const deviceInfo = accessory.context.device[ControllerPropertyKey.DEVICE_INFO];
    const modelName = typeof deviceInfo === 'string' ? deviceInfo : 
                      typeof deviceInfo === 'object' && deviceInfo?.deviceName ? deviceInfo.deviceName :
                      'AC Infinity Controller';
    
    this.informationService
      .setCharacteristic(this.platform.Characteristic.Manufacturer, MANUFACTURER)
      .setCharacteristic(this.platform.Characteristic.Model, modelName)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, accessory.context.device[ControllerPropertyKey.MAC_ADDR] || 'Unknown')
      .setCharacteristic(this.platform.Characteristic.FirmwareRevision, accessory.context.device[ControllerPropertyKey.SW_VERSION] || '1.0.0');

    // Don't store controller instance to avoid circular reference
    // The platform will handle updates via the updateDevice method

    // Create services based on device capabilities
    this.setupSensors();
    this.setupPorts();
  }

  private setupSensors() {
    const device = this.accessory.context.device;
    
    // Built-in temperature sensor
    if (ControllerPropertyKey.TEMPERATURE in device && device[ControllerPropertyKey.TEMPERATURE] !== null) {
      this.temperatureService = this.accessory.getService(this.platform.Service.TemperatureSensor) || undefined;
      if (!this.temperatureService) {
        this.temperatureService = this.accessory.addService(this.platform.Service.TemperatureSensor, 'Temperature');
      }
      
      this.temperatureService.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
        .onGet(this.getTemperature.bind(this));
    }

    // Built-in humidity sensor
    if (ControllerPropertyKey.HUMIDITY in device && device[ControllerPropertyKey.HUMIDITY] !== null) {
      this.humidityService = this.accessory.getService(this.platform.Service.HumiditySensor) || undefined;
      if (!this.humidityService) {
        this.humidityService = this.accessory.addService(this.platform.Service.HumiditySensor, 'Humidity');
      }
      
      this.humidityService.getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity)
        .onGet(this.getHumidity.bind(this));
    }

    // Additional sensors (for AI controllers)
    if (ControllerPropertyKey.SENSORS in device && Array.isArray(device[ControllerPropertyKey.SENSORS])) {
      for (const sensor of device[ControllerPropertyKey.SENSORS]) {
        this.setupAdditionalSensor(sensor);
      }
    }
  }

  private setupAdditionalSensor(sensor: any) {
    const sensorType = sensor[SensorPropertyKey.SENSOR_TYPE];
    const port = sensor[SensorPropertyKey.ACCESS_PORT];
    
    switch (sensorType) {
      case SensorType.PROBE_TEMPERATURE_F:
      case SensorType.PROBE_TEMPERATURE_C: {
        const service = this.accessory.getService(`Probe Temperature ${port}`) ||
          this.accessory.addService(this.platform.Service.TemperatureSensor, `Probe Temperature ${port}`, `probe-temp-${port}`);
        
        service.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
          .onGet(() => this.getSensorValue(sensor));
        break;
      }
      
      case SensorType.PROBE_HUMIDITY: {
        const service = this.accessory.getService(`Probe Humidity ${port}`) ||
          this.accessory.addService(this.platform.Service.HumiditySensor, `Probe Humidity ${port}`, `probe-humidity-${port}`);
        
        service.getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity)
          .onGet(() => this.getSensorValue(sensor));
        break;
      }
      
      case SensorType.CO2: {
        const service = this.accessory.getService(`CO2 Sensor ${port}`) ||
          this.accessory.addService(this.platform.Service.CarbonDioxideSensor, `CO2 Sensor ${port}`, `co2-${port}`);
        
        service.getCharacteristic(this.platform.Characteristic.CarbonDioxideLevel)
          .onGet(() => this.getSensorValue(sensor));
        
        // Set detection state based on threshold (1000 ppm is a common threshold)
        service.getCharacteristic(this.platform.Characteristic.CarbonDioxideDetected)
          .onGet(() => {
            const value = this.getSensorValue(sensor);
            return value > 1000 ? this.platform.Characteristic.CarbonDioxideDetected.CO2_LEVELS_ABNORMAL
              : this.platform.Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL;
          });
        break;
      }
    }
  }

  private setupPorts() {
    const device = this.accessory.context.device;
    
    if (ControllerPropertyKey.PORTS in device && Array.isArray(device[ControllerPropertyKey.PORTS])) {
      for (const port of device[ControllerPropertyKey.PORTS]) {
        this.setupPort(port);
      }
    }
  }

  private setupPort(port: any) {
    const portNumber = port[PortPropertyKey.PORT];
    const portName = port[PortPropertyKey.NAME] || `Port ${portNumber}`;
    
    // Create a fan service for each port
    const fanService = this.accessory.getService(portName) ||
      this.accessory.addService(this.platform.Service.Fanv2, portName, `port-${portNumber}`);
    
    // Store service reference
    this.portServices.set(portNumber, fanService);
    
    // Set up characteristics
    fanService.getCharacteristic(this.platform.Characteristic.Active)
      .onGet(() => this.getPortActive(portNumber))
      .onSet((value) => this.setPortActive(portNumber, value));
    
    fanService.getCharacteristic(this.platform.Characteristic.CurrentFanState)
      .onGet(() => this.getPortState(portNumber));
    
    fanService.getCharacteristic(this.platform.Characteristic.TargetFanState)
      .onGet(() => this.getPortTargetState(portNumber))
      .onSet((value) => this.setPortTargetState(portNumber, value));
    
    fanService.getCharacteristic(this.platform.Characteristic.RotationSpeed)
      .onGet(() => this.getPortSpeed(portNumber))
      .onSet((value) => this.setPortSpeed(portNumber, value));
  }

  async getTemperature(): Promise<CharacteristicValue> {
    const device = this.accessory.context.device;
    const temp = device[ControllerPropertyKey.TEMPERATURE];
    
    // Convert from Fahrenheit to Celsius if needed
    // The API seems to return temperature in the unit set on the device
    return temp !== null ? temp : 0;
  }

  async getHumidity(): Promise<CharacteristicValue> {
    const device = this.accessory.context.device;
    return device[ControllerPropertyKey.HUMIDITY] || 0;
  }

  getSensorValue(sensor: any): number {
    return sensor[SensorPropertyKey.SENSOR_DATA] || 0;
  }

  async getPortActive(portNumber: number): Promise<CharacteristicValue> {
    const port = this.findPort(portNumber);
    if (!port) {
      return this.platform.Characteristic.Active.INACTIVE;
    }
    
    const state = port[PortPropertyKey.STATE];
    return state > 0 ? this.platform.Characteristic.Active.ACTIVE : this.platform.Characteristic.Active.INACTIVE;
  }

  async setPortActive(portNumber: number, value: CharacteristicValue) {
    try {
      const active = value === this.platform.Characteristic.Active.ACTIVE;
      const speed = active ? 10 : 0; // Default to speed 10 when turning on
      
      await this.platform.client.setDeviceModeSettings(
        this.deviceId,
        portNumber,
        [[PortControlKey.ON_SPEED, speed]]
      );
    } catch (error) {
      this.platform.log.error('Failed to set port active state:', error);
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }

  async getPortState(portNumber: number): Promise<CharacteristicValue> {
    const port = this.findPort(portNumber);
    if (!port) {
      return this.platform.Characteristic.CurrentFanState.IDLE;
    }
    
    const state = port[PortPropertyKey.STATE];
    return state > 0 ? this.platform.Characteristic.CurrentFanState.BLOWING_AIR 
      : this.platform.Characteristic.CurrentFanState.IDLE;
  }

  async getPortTargetState(portNumber: number): Promise<CharacteristicValue> {
    // For simplicity, we'll use AUTO mode
    return this.platform.Characteristic.TargetFanState.AUTO;
  }

  async setPortTargetState(portNumber: number, value: CharacteristicValue) {
    // In the future, this could be used to switch between manual/auto modes
    this.platform.log.debug(`Port ${portNumber} target state set to:`, value);
  }

  async getPortSpeed(portNumber: number): Promise<CharacteristicValue> {
    try {
      const settings = await this.platform.client.getDeviceModeSettingsList(this.deviceId, portNumber);
      const speed = settings[PortControlKey.ON_SPEED] || 0;
      return speed * 10; // Convert 0-10 to 0-100
    } catch (error) {
      this.platform.log.error('Failed to get port speed:', error);
      return 0;
    }
  }

  async setPortSpeed(portNumber: number, value: CharacteristicValue) {
    try {
      const speed = Math.round(Number(value) / 10); // Convert 0-100 to 0-10
      
      await this.platform.client.setDeviceModeSettings(
        this.deviceId,
        portNumber,
        [[PortControlKey.ON_SPEED, speed]]
      );
    } catch (error) {
      this.platform.log.error('Failed to set port speed:', error);
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }

  private findPort(portNumber: number): any {
    const device = this.accessory.context.device;
    if (!device[ControllerPropertyKey.PORTS]) {
      return null;
    }
    
    return device[ControllerPropertyKey.PORTS].find((p: any) => p[PortPropertyKey.PORT] === portNumber);
  }

  updateDevice(device: any) {
    // Update context
    this.accessory.context.device = device;
    
    // Update temperature
    if (this.temperatureService) {
      this.temperatureService.updateCharacteristic(
        this.platform.Characteristic.CurrentTemperature,
        device[ControllerPropertyKey.TEMPERATURE] || 0
      );
    }
    
    // Update humidity
    if (this.humidityService) {
      this.humidityService.updateCharacteristic(
        this.platform.Characteristic.CurrentRelativeHumidity,
        device[ControllerPropertyKey.HUMIDITY] || 0
      );
    }
    
    // Update ports
    if (device[ControllerPropertyKey.PORTS]) {
      for (const port of device[ControllerPropertyKey.PORTS]) {
        const portNumber = port[PortPropertyKey.PORT];
        const service = this.portServices.get(portNumber);
        
        if (service) {
          const state = port[PortPropertyKey.STATE];
          const isActive = state > 0;
          
          service.updateCharacteristic(
            this.platform.Characteristic.Active,
            isActive ? this.platform.Characteristic.Active.ACTIVE : this.platform.Characteristic.Active.INACTIVE
          );
          
          service.updateCharacteristic(
            this.platform.Characteristic.CurrentFanState,
            isActive ? this.platform.Characteristic.CurrentFanState.BLOWING_AIR 
              : this.platform.Characteristic.CurrentFanState.IDLE
          );
        }
      }
    }
    
    // Update additional sensors
    if (device[ControllerPropertyKey.SENSORS]) {
      for (const sensor of device[ControllerPropertyKey.SENSORS]) {
        this.updateSensor(sensor);
      }
    }
  }

  private updateSensor(sensor: any) {
    const sensorType = sensor[SensorPropertyKey.SENSOR_TYPE];
    const port = sensor[SensorPropertyKey.ACCESS_PORT];
    const value = sensor[SensorPropertyKey.SENSOR_DATA] || 0;
    
    switch (sensorType) {
      case SensorType.PROBE_TEMPERATURE_F:
      case SensorType.PROBE_TEMPERATURE_C: {
        const service = this.accessory.getService(`Probe Temperature ${port}`);
        if (service) {
          service.updateCharacteristic(this.platform.Characteristic.CurrentTemperature, value);
        }
        break;
      }
      
      case SensorType.PROBE_HUMIDITY: {
        const service = this.accessory.getService(`Probe Humidity ${port}`);
        if (service) {
          service.updateCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity, value);
        }
        break;
      }
      
      case SensorType.CO2: {
        const service = this.accessory.getService(`CO2 Sensor ${port}`);
        if (service) {
          service.updateCharacteristic(this.platform.Characteristic.CarbonDioxideLevel, value);
          service.updateCharacteristic(
            this.platform.Characteristic.CarbonDioxideDetected,
            value > 1000 ? this.platform.Characteristic.CarbonDioxideDetected.CO2_LEVELS_ABNORMAL
              : this.platform.Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL
          );
        }
        break;
      }
    }
  }
}