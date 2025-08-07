import { PlatformAccessory, CharacteristicValue } from 'homebridge';
import { ACInfinityPlatform } from '../platform';
import { ControllerPropertyKey, PortPropertyKey, PortControlKey } from '../constants';

export class ACInfinityFanPort {
  private readonly platform: ACInfinityPlatform;
  private readonly accessory: PlatformAccessory;
  private readonly deviceId: string;
  private readonly portNumber: number;
  private readonly informationService;
  private readonly fanService;

  constructor(platform: ACInfinityPlatform, accessory: PlatformAccessory) {
    this.platform = platform;
    this.accessory = accessory;
    this.deviceId = accessory.context.deviceId;
    this.portNumber = accessory.context.portNumber;

    // Set accessory information
    this.informationService = this.accessory.getService(this.platform.Service.AccessoryInformation)!;
    const device = accessory.context.device;
    const port = accessory.context.port;
    
    this.informationService
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'AC Infinity')
      .setCharacteristic(this.platform.Characteristic.Model, 'Fan Port')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, `${device[ControllerPropertyKey.MAC_ADDR] || 'Unknown'}-Port${this.portNumber}`)
      .setCharacteristic(this.platform.Characteristic.FirmwareRevision, device[ControllerPropertyKey.SW_VERSION] || '1.0.0');

    // Create fan service
    const portName = port[PortPropertyKey.NAME] || `Port ${this.portNumber}`;
    this.fanService = this.accessory.getService(this.platform.Service.Fanv2) || 
      this.accessory.addService(this.platform.Service.Fanv2, portName);

    // Set up characteristics
    this.fanService.getCharacteristic(this.platform.Characteristic.Active)
      .onGet(this.getActive.bind(this))
      .onSet(this.setActive.bind(this));

    this.fanService.getCharacteristic(this.platform.Characteristic.CurrentFanState)
      .onGet(this.getState.bind(this));

    this.fanService.getCharacteristic(this.platform.Characteristic.TargetFanState)
      .onGet(this.getTargetState.bind(this))
      .onSet(this.setTargetState.bind(this));

    this.fanService.getCharacteristic(this.platform.Characteristic.RotationSpeed)
      .onGet(this.getSpeed.bind(this))
      .onSet(this.setSpeed.bind(this));
  }

  async getActive(): Promise<CharacteristicValue> {
    const port = this.accessory.context.port;
    if (!port) {
      return this.platform.Characteristic.Active.INACTIVE;
    }
    
    const state = port[PortPropertyKey.STATE];
    return state > 0 ? this.platform.Characteristic.Active.ACTIVE : this.platform.Characteristic.Active.INACTIVE;
  }

  async setActive(value: CharacteristicValue): Promise<void> {
    try {
      const active = value === this.platform.Characteristic.Active.ACTIVE;
      const speed = active ? 10 : 0; // Default to speed 10 when turning on
      await this.platform.client.setDeviceModeSettings(this.deviceId, this.portNumber, [[PortControlKey.ON_SPEED, speed]]);
    } catch (error) {
      this.platform.log.error('Failed to set port active state:', error);
      throw new this.platform.api.hap.HapStatusError(-70402);
    }
  }

  async getState(): Promise<CharacteristicValue> {
    const port = this.accessory.context.port;
    if (!port) {
      return this.platform.Characteristic.CurrentFanState.IDLE;
    }
    
    const state = port[PortPropertyKey.STATE];
    return state > 0 ? this.platform.Characteristic.CurrentFanState.BLOWING_AIR
      : this.platform.Characteristic.CurrentFanState.IDLE;
  }

  async getTargetState(): Promise<CharacteristicValue> {
    // For simplicity, we'll use AUTO mode
    return this.platform.Characteristic.TargetFanState.AUTO;
  }

  async setTargetState(value: CharacteristicValue): Promise<void> {
    // In the future, this could be used to switch between manual/auto modes
    this.platform.log.debug(`Port ${this.portNumber} target state set to:`, value);
  }

  async getSpeed(): Promise<CharacteristicValue> {
    try {
      const settings = await this.platform.client.getDeviceModeSettingsList(this.deviceId, this.portNumber);
      const speed = settings[PortControlKey.ON_SPEED] || 0;
      return speed * 10; // Convert 0-10 to 0-100
    } catch (error) {
      this.platform.log.error('Failed to get port speed:', error);
      return 0;
    }
  }

  async setSpeed(value: CharacteristicValue): Promise<void> {
    try {
      const speed = Math.round(Number(value) / 10); // Convert 0-100 to 0-10
      if (this.platform.config.debug) {
        this.platform.log.debug(`[FanPort] Setting speed for port ${this.portNumber} on device ${this.deviceId} to ${speed} (HomeKit value: ${value})`);
      }
      await this.platform.client.setDeviceModeSettings(this.deviceId, this.portNumber, [[PortControlKey.ON_SPEED, speed]]);
      if (this.platform.config.debug) {
        this.platform.log.debug(`[FanPort] Successfully set speed for port ${this.portNumber}`);
      }
    } catch (error) {
      this.platform.log.error('Failed to set port speed:', error);
      throw new this.platform.api.hap.HapStatusError(-70402);
    }
  }

  updatePort(port: any): void {
    // Update context
    this.accessory.context.port = port;
    
    // Update characteristics
    const state = port[PortPropertyKey.STATE];
    const isActive = state > 0;
    
    this.fanService.updateCharacteristic(
      this.platform.Characteristic.Active, 
      isActive ? this.platform.Characteristic.Active.ACTIVE : this.platform.Characteristic.Active.INACTIVE
    );
    
    this.fanService.updateCharacteristic(
      this.platform.Characteristic.CurrentFanState,
      isActive ? this.platform.Characteristic.CurrentFanState.BLOWING_AIR
        : this.platform.Characteristic.CurrentFanState.IDLE
    );
  }
}