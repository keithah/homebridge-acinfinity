import { PlatformAccessory, CharacteristicValue } from 'homebridge';
import { ACInfinityPlatform } from '../platform';
import { ControllerPropertyKey, SensorPropertyKey, SensorType } from '../constants';

export class ACInfinitySensor {
  private readonly platform: ACInfinityPlatform;
  private readonly accessory: PlatformAccessory;
  private readonly sensorType: string;
  private readonly informationService;
  private readonly sensorService;

  constructor(platform: ACInfinityPlatform, accessory: PlatformAccessory) {
    this.platform = platform;
    this.accessory = accessory;
    this.sensorType = accessory.context.sensorType;

    // Set accessory information
    this.informationService = this.accessory.getService(this.platform.Service.AccessoryInformation)!;
    const device = accessory.context.device;
    
    this.informationService
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'AC Infinity')
      .setCharacteristic(this.platform.Characteristic.Model, this.getSensorModelName())
      .setCharacteristic(this.platform.Characteristic.SerialNumber, `${device[ControllerPropertyKey.MAC_ADDR] || 'Unknown'}-${this.sensorType}`)
      .setCharacteristic(this.platform.Characteristic.FirmwareRevision, device[ControllerPropertyKey.SW_VERSION] || '1.0.0');

    // Create appropriate sensor service
    this.sensorService = this.createSensorService();
  }

  private getSensorModelName(): string {
    switch (this.sensorType) {
      case 'controller-temp':
        return 'Controller Temperature Sensor';
      case 'controller-humidity':
        return 'Controller Humidity Sensor';
      default:
        return 'AC Infinity Sensor';
    }
  }

  private createSensorService() {
    switch (this.sensorType) {
      case 'controller-temp':
        const tempService = this.accessory.getService(this.platform.Service.TemperatureSensor) ||
          this.accessory.addService(this.platform.Service.TemperatureSensor, 'Controller Temperature');
        
        tempService.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
          .onGet(this.getTemperature.bind(this));
        
        return tempService;

      case 'controller-humidity':
        const humidityService = this.accessory.getService(this.platform.Service.HumiditySensor) ||
          this.accessory.addService(this.platform.Service.HumiditySensor, 'Controller Humidity');
        
        humidityService.getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity)
          .onGet(this.getHumidity.bind(this));
        
        return humidityService;

      default:
        throw new Error(`Unsupported sensor type: ${this.sensorType}`);
    }
  }

  async getTemperature(): Promise<CharacteristicValue> {
    const device = this.accessory.context.device;
    const deviceInfo = device[ControllerPropertyKey.DEVICE_INFO];
    const temp = deviceInfo ? deviceInfo[ControllerPropertyKey.TEMPERATURE] : null;
    // Convert from raw API value to Celsius (API returns value * 100)
    return temp !== null ? temp / 100 : 0;
  }

  async getHumidity(): Promise<CharacteristicValue> {
    const device = this.accessory.context.device;
    const deviceInfo = device[ControllerPropertyKey.DEVICE_INFO];
    const humidity = deviceInfo ? deviceInfo[ControllerPropertyKey.HUMIDITY] : null;
    // Convert from raw API value to percentage (API returns value * 100)
    return humidity !== null ? humidity / 100 : 0;
  }

  updateSensor(device: any): void {
    // Update context
    this.accessory.context.device = device;
    
    const deviceInfo = device[ControllerPropertyKey.DEVICE_INFO];
    if (!deviceInfo) return;

    // Update characteristics based on sensor type
    switch (this.sensorType) {
      case 'controller-temp':
        const temp = deviceInfo[ControllerPropertyKey.TEMPERATURE];
        if (temp !== null && temp !== undefined) {
          this.sensorService.updateCharacteristic(
            this.platform.Characteristic.CurrentTemperature,
            temp / 100
          );
        }
        break;

      case 'controller-humidity':
        const humidity = deviceInfo[ControllerPropertyKey.HUMIDITY];
        if (humidity !== null && humidity !== undefined) {
          this.sensorService.updateCharacteristic(
            this.platform.Characteristic.CurrentRelativeHumidity,
            humidity / 100
          );
        }
        break;
    }
  }
}