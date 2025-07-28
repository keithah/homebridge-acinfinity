import {
  API,
  APIEvent,
  DynamicPlatformPlugin,
  Logger,
  PlatformAccessory,
  PlatformConfig,
  Service,
  Characteristic,
} from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './constants';
import { ACInfinityClient } from './api/ACInfinityClient';
import { ACInfinityController } from './accessories/ACInfinityController';

export interface ACInfinityPlatformConfig extends PlatformConfig {
  email: string;
  password: string;
  host?: string;
  pollingInterval?: number;
}

export class ACInfinityPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;
  public readonly accessories: PlatformAccessory[] = [];
  public readonly client: ACInfinityClient;
  
  private readonly discoveredDevices = new Set<string>();
  private readonly controllerInstances = new Map<string, ACInfinityController>();
  private pollingInterval: number;
  private updateTimer?: NodeJS.Timeout;

  constructor(
    public readonly log: Logger,
    public readonly config: ACInfinityPlatformConfig,
    public readonly api: API,
  ) {
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;
    
    // Initialize client
    const host = config.host || 'http://www.acinfinityserver.com';
    this.client = new ACInfinityClient(host, config.email, config.password, log);
    
    // Set polling interval (default 10 seconds, min 5, max 600)
    this.pollingInterval = Math.max(5, Math.min(600, config.pollingInterval || 10)) * 1000;

    this.log.debug('Finished initializing platform:', config.name);

    this.api.on(APIEvent.DID_FINISH_LAUNCHING, () => {
      log.debug('Executed didFinishLaunching callback');
      this.discoverDevices();
    });

    this.api.on(APIEvent.SHUTDOWN, () => {
      if (this.updateTimer) {
        clearInterval(this.updateTimer);
        this.updateTimer = undefined;
      }
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    this.accessories.push(accessory);
  }

  async discoverDevices() {
    try {
      // Login to API
      if (!this.client.isLoggedIn()) {
        this.log.info('Logging into AC Infinity API...');
        await this.client.login();
        this.log.info('Successfully logged in to AC Infinity API');
      }

      // Get all devices
      this.log.info('Fetching device list from AC Infinity API...');
      const devices = await this.client.getDevicesListAll();
      this.log.info(`Found ${devices.length} device(s) from AC Infinity API`);
      this.log.info('Device data:', JSON.stringify(devices, null, 2));
      
      // Process each device
      for (const device of devices) {
        const uuid = this.api.hap.uuid.generate(device.devId);
        this.discoveredDevices.add(uuid);

        // Check if accessory already exists
        const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

        if (existingAccessory) {
          // Update existing accessory
          this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
          existingAccessory.context.device = device;
          const controller = new ACInfinityController(this, existingAccessory);
          this.controllerInstances.set(uuid, controller);
        } else {
          // Create new accessory
          this.log.info('Adding new accessory:', device.devName);
          const accessory = new this.api.platformAccessory(device.devName, uuid);
          accessory.context.device = device;
          const controller = new ACInfinityController(this, accessory);
          this.controllerInstances.set(uuid, controller);
          this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        }
      }

      // Remove accessories that are no longer present
      const accessoriesToRemove = this.accessories.filter(accessory => !this.discoveredDevices.has(accessory.UUID));
      if (accessoriesToRemove.length > 0) {
        this.log.info('Removing accessories no longer present:', accessoriesToRemove.map(a => a.displayName));
        // Clean up controller instances
        for (const accessory of accessoriesToRemove) {
          this.controllerInstances.delete(accessory.UUID);
        }
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, accessoriesToRemove);
      }

      // Start update timer
      if (!this.updateTimer) {
        this.updateTimer = setInterval(() => {
          this.updateDevices();
        }, this.pollingInterval);
      }
    } catch (error) {
      this.log.error('Failed to discover devices:', error);
      // Retry after a delay
      setTimeout(() => {
        this.discoverDevices();
      }, 30000); // Retry after 30 seconds
    }
  }

  async updateDevices() {
    try {
      if (!this.client.isLoggedIn()) {
        await this.client.login();
      }

      const devices = await this.client.getDevicesListAll();
      
      for (const device of devices) {
        const uuid = this.api.hap.uuid.generate(device.devId);
        const accessory = this.accessories.find(a => a.UUID === uuid);
        
        if (accessory) {
          accessory.context.device = device;
          const controller = this.controllerInstances.get(uuid);
          if (controller) {
            controller.updateDevice(device);
          }
        }
      }
    } catch (error) {
      this.log.error('Failed to update devices:', error);
    }
  }
}