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

import { PLATFORM_NAME, PLUGIN_NAME, ControllerPropertyKey, PortPropertyKey } from './constants';
import { ACInfinityClient } from './api/ACInfinityClient';
import { ACInfinityController } from './accessories/ACInfinityController';
import { ACInfinityFanPort } from './accessories/ACInfinityFanPort';
import { ACInfinitySensor } from './accessories/ACInfinitySensor';
import * as packageJson from '../package.json';

export interface ACInfinityPlatformConfig extends PlatformConfig {
  email: string;
  password: string;
  host?: string;
  pollingInterval?: number;
  exposeSensors?: boolean;
  exposePortDevices?: boolean;
  debug?: boolean;
}

export class ACInfinityPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;
  public readonly accessories: PlatformAccessory[] = [];
  public readonly client: ACInfinityClient;
  
  private readonly discoveredDevices = new Set<string>();
  private readonly controllerInstances = new Map<string, ACInfinityController>();
  private readonly portInstances = new Map<string, ACInfinityFanPort>();
  private readonly sensorInstances = new Map<string, ACInfinitySensor>();
  private pollingInterval: number;
  private updateTimer?: NodeJS.Timeout;
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;

  constructor(
    public readonly log: Logger,
    public readonly config: ACInfinityPlatformConfig,
    public readonly api: API,
  ) {
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;
    
    // Initialize client
    const host = config.host || 'http://www.acinfinityserver.com';
    this.client = new ACInfinityClient(host, config.email, config.password, log, config.debug);
    
    // Set polling interval (default 10 seconds, min 5, max 600)
    this.pollingInterval = Math.max(5, Math.min(600, config.pollingInterval || 10)) * 1000;

    this.log.info(`[AC Infinity] Initializing ACInfinity platform v${packageJson.version}...`);
    if (config.debug) {
      this.log.info('[AC Infinity] Debug mode enabled - detailed logging active');
    }
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
        this.log.debug('Successfully logged in to AC Infinity API');
      }

      // Get all devices
      this.log.debug('Fetching device list from AC Infinity API...');
      const devices = await this.client.getDevicesListAll();
      this.log.info(`Found ${devices.length} device(s) from AC Infinity API`);
      
      if (this.config.debug) {
        this.log.info('=== DETAILED DEVICE DEBUG INFO ===');
        devices.forEach((device, index) => {
          this.log.info(`Device ${index + 1}:`);
          this.log.info(`  Name: ${device.devName}`);
          this.log.info(`  ID: ${device.devId}`);
          this.log.info(`  Type: ${device.devType}`);
          this.log.info(`  MAC: ${device.devMacAddr}`);
          this.log.info(`  Online: ${device.online}`);
          this.log.info(`  Hardware Version: ${device.hardwareVersion}`);
          this.log.info(`  Firmware Version: ${device.firmwareVersion}`);
          
          const deviceInfo = device[ControllerPropertyKey.DEVICE_INFO];
          if (deviceInfo) {
            this.log.info(`  Temperature: ${deviceInfo.temperature / 100}°C`);
            this.log.info(`  Humidity: ${deviceInfo.humidity / 100}%`);
            this.log.info(`  VPD: ${deviceInfo.vpdnums / 100}`);
            
            if (deviceInfo.ports && Array.isArray(deviceInfo.ports)) {
              this.log.info(`  Ports (${deviceInfo.ports.length}):`);
              deviceInfo.ports.forEach((port: any) => {
                this.log.info(`    Port ${port.port}: ${port.portName || 'Unnamed'}`);
                this.log.info(`      Online: ${port.online}`);
                this.log.info(`      LoadState: ${port.loadState}`);
                this.log.info(`      Speak (Power): ${port.speak}/10`);
                this.log.info(`      Current Mode: ${port.curMode}`);
                this.log.info(`      Remaining Time: ${port.remainTime}min`);
              });
            }
            
            if (deviceInfo.sensors && Array.isArray(deviceInfo.sensors)) {
              this.log.info(`  Sensors (${deviceInfo.sensors.length}):`);
              deviceInfo.sensors.forEach((sensor: any) => {
                this.log.info(`    Sensor Port ${sensor.accessPort}: Type ${sensor.sensorType}`);
                this.log.info(`      Data: ${sensor.sensorData}`);
                this.log.info(`      Unit: ${sensor.sensorUnit}`);
                this.log.info(`      Precision: ${sensor.sensorPrecision}`);
              });
            }
          }
          this.log.info('  Full Device Data:', JSON.stringify(device, null, 2));
        });
        this.log.info('=== END DEVICE DEBUG INFO ===');
      }
      
      // Process each device and create individual accessories for each port
      for (const device of devices) {
        const deviceInfo = device[ControllerPropertyKey.DEVICE_INFO];
        
        if (deviceInfo && ControllerPropertyKey.PORTS in deviceInfo && Array.isArray(deviceInfo[ControllerPropertyKey.PORTS])) {
          // Create individual accessories for each port with devices connected (if enabled)
          if (this.config.exposePortDevices !== false) { // Default to true if not specified
            for (const port of deviceInfo[ControllerPropertyKey.PORTS]) {
              // Only show ports that have devices connected (resistance < 65535 indicates a connected device)
              // or are explicitly online. Empty ports have resistance = 65535
              const hasConnectedDevice = port.portResistance && port.portResistance < 65535;
              const isOnline = port.online;
            
            if (!hasConnectedDevice && !isOnline) {
              if (this.config.debug) {
                this.log.debug(`Skipping port ${port[PortPropertyKey.PORT]} - no device connected (online: ${port.online}, resistance: ${port.portResistance})`);
              }
              continue;
            }
            
            if (this.config.debug) {
              this.log.info(`Exposing port ${port[PortPropertyKey.PORT]} to HomeKit (hasDevice: ${hasConnectedDevice}, online: ${isOnline}, resistance: ${port.portResistance})`);
            }
            const portNumber = port[PortPropertyKey.PORT];
            const portName = port[PortPropertyKey.NAME] || `${device.devName} Port ${portNumber}`;
            const portUuid = this.api.hap.uuid.generate(`${device.devId}-port-${portNumber}`);
            
            if (this.config.debug) {
              this.log.info(`Processing active port ${portNumber}: ${portName} (UUID: ${portUuid})`);
            }
            
            this.discoveredDevices.add(portUuid);

            // Check if port accessory already exists
            const existingAccessory = this.accessories.find(accessory => accessory.UUID === portUuid);

            if (existingAccessory) {
              // Update existing port accessory
              this.log.debug('Restoring existing port accessory from cache:', existingAccessory.displayName);
              existingAccessory.context.device = device;
              existingAccessory.context.port = port;
              existingAccessory.context.deviceId = device.devId;
              existingAccessory.context.portNumber = portNumber;
              const fanPort = new ACInfinityFanPort(this, existingAccessory);
              this.portInstances.set(portUuid, fanPort);
            } else {
              // Create new port accessory
              this.log.info('Adding new port accessory:', portName);
              const accessory = new this.api.platformAccessory(portName, portUuid);
              accessory.context.device = device;
              accessory.context.port = port;
              accessory.context.deviceId = device.devId;
              accessory.context.portNumber = portNumber;
              const fanPort = new ACInfinityFanPort(this, accessory);
              this.portInstances.set(portUuid, fanPort);
              this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
            }
          }
          } else {
            if (this.config.debug) {
              this.log.info(`Port devices disabled in configuration for ${device.devName} - only sensors will be exposed`);
            }
          }
        }

        // Create sensor accessories if enabled
        if (this.config.exposeSensors && deviceInfo) {
          // Device temperature sensor
          if (deviceInfo[ControllerPropertyKey.TEMPERATURE] !== null && deviceInfo[ControllerPropertyKey.TEMPERATURE] !== undefined) {
            const tempUuid = this.api.hap.uuid.generate(`${device.devId}-sensor-controller-temp`);
            this.discoveredDevices.add(tempUuid);
            const tempName = `${device.devName} Temperature`;

            const existingTempAccessory = this.accessories.find(accessory => accessory.UUID === tempUuid);
            if (existingTempAccessory) {
              this.log.debug('Restoring existing temperature sensor from cache:', existingTempAccessory.displayName);
              existingTempAccessory.context.device = device;
              existingTempAccessory.context.sensorType = 'controller-temp';
              existingTempAccessory.displayName = tempName;
              existingTempAccessory._associatedHAPAccessory.displayName = tempName;
              const tempSensor = new ACInfinitySensor(this, existingTempAccessory);
              this.sensorInstances.set(tempUuid, tempSensor);
            } else {
              this.log.info('Adding new temperature sensor accessory:', tempName);
              const tempAccessory = new this.api.platformAccessory(tempName, tempUuid);
              tempAccessory.context.device = device;
              tempAccessory.context.sensorType = 'controller-temp';
              const tempSensor = new ACInfinitySensor(this, tempAccessory);
              this.sensorInstances.set(tempUuid, tempSensor);
              this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [tempAccessory]);
            }
          }

          // Device humidity sensor
          if (deviceInfo[ControllerPropertyKey.HUMIDITY] !== null && deviceInfo[ControllerPropertyKey.HUMIDITY] !== undefined) {
            const humidityUuid = this.api.hap.uuid.generate(`${device.devId}-sensor-controller-humidity`);
            this.discoveredDevices.add(humidityUuid);
            const humidityName = `${device.devName} Humidity`;

            const existingHumidityAccessory = this.accessories.find(accessory => accessory.UUID === humidityUuid);
            if (existingHumidityAccessory) {
              this.log.debug('Restoring existing humidity sensor from cache:', existingHumidityAccessory.displayName);
              existingHumidityAccessory.context.device = device;
              existingHumidityAccessory.context.sensorType = 'controller-humidity';
              existingHumidityAccessory.displayName = humidityName;
              existingHumidityAccessory._associatedHAPAccessory.displayName = humidityName;
              const humiditySensor = new ACInfinitySensor(this, existingHumidityAccessory);
              this.sensorInstances.set(humidityUuid, humiditySensor);
            } else {
              this.log.info('Adding new humidity sensor accessory:', humidityName);
              const humidityAccessory = new this.api.platformAccessory(humidityName, humidityUuid);
              humidityAccessory.context.device = device;
              humidityAccessory.context.sensorType = 'controller-humidity';
              const humiditySensor = new ACInfinitySensor(this, humidityAccessory);
              this.sensorInstances.set(humidityUuid, humiditySensor);
              this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [humidityAccessory]);
            }
          }
        }
      }

      // Remove accessories that are no longer present
      const accessoriesToRemove = this.accessories.filter(accessory => !this.discoveredDevices.has(accessory.UUID));
      if (accessoriesToRemove.length > 0) {
        this.log.info('Removing accessories no longer present:', accessoriesToRemove.map(a => a.displayName));
        // Clean up instances
        for (const accessory of accessoriesToRemove) {
          this.controllerInstances.delete(accessory.UUID);
          this.portInstances.delete(accessory.UUID);
          this.sensorInstances.delete(accessory.UUID);
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
      if (error instanceof Error) {
        this.log.error(`Error details - Name: ${error.name}, Message: ${error.message}`);
        if (error.stack) {
          this.log.error(`Stack trace:`, error.stack);
        }
      }
      // Retry after a delay
      setTimeout(() => {
        this.log.info('Retrying device discovery...');
        this.discoverDevices();
      }, 30000); // Retry after 30 seconds
    }
  }

  async updateDevices() {
    try {
      if (this.config.debug) {
        this.log.debug('[Platform] Starting device update cycle...');
      }
      
      if (!this.client.isLoggedIn()) {
        if (this.config.debug) {
          this.log.debug('[Platform] Client not logged in, logging in...');
        }
        await this.queueRequest(() => this.client.login());
      }

      const devices = await this.queueRequest(() => this.client.getDevicesListAll());
      
      if (this.config.debug) {
        this.log.debug(`[Platform] Retrieved ${devices.length} devices for update`);
      }
      
      for (const device of devices) {
        const deviceInfo = device[ControllerPropertyKey.DEVICE_INFO];
        
        if (deviceInfo && ControllerPropertyKey.PORTS in deviceInfo && Array.isArray(deviceInfo[ControllerPropertyKey.PORTS])) {
          // Update individual port accessories
          for (const port of deviceInfo[ControllerPropertyKey.PORTS]) {
            const portNumber = port[PortPropertyKey.PORT];
            const portUuid = this.api.hap.uuid.generate(`${device.devId}-port-${portNumber}`);
            const accessory = this.accessories.find(a => a.UUID === portUuid);
            
            if (accessory) {
              if (this.config.debug) {
                this.log.debug(`[Platform] Updating port ${portNumber} (${port[PortPropertyKey.NAME]}): speak=${port[PortPropertyKey.SPEAK]}, mode=${port[PortPropertyKey.CURRENT_MODE]}, state=${port[PortPropertyKey.STATE]}`);
              }
              accessory.context.device = device;
              accessory.context.port = port;
              const fanPort = this.portInstances.get(portUuid);
              if (fanPort) {
                fanPort.updatePort(port);
              }
            }
          }
        }

        // Update sensor accessories if enabled
        if (this.config.exposeSensors && deviceInfo) {
          // Update temperature sensor
          const tempUuid = this.api.hap.uuid.generate(`${device.devId}-sensor-controller-temp`);
          const tempAccessory = this.accessories.find(a => a.UUID === tempUuid);
          if (tempAccessory) {
            tempAccessory.context.device = device;
            const tempSensor = this.sensorInstances.get(tempUuid);
            if (tempSensor) {
              tempSensor.updateSensor(device);
            }
          }

          // Update humidity sensor
          const humidityUuid = this.api.hap.uuid.generate(`${device.devId}-sensor-controller-humidity`);
          const humidityAccessory = this.accessories.find(a => a.UUID === humidityUuid);
          if (humidityAccessory) {
            humidityAccessory.context.device = device;
            const humiditySensor = this.sensorInstances.get(humidityUuid);
            if (humiditySensor) {
              humiditySensor.updateSensor(device);
            }
          }
        }
      }
    } catch (error) {
      this.log.error('Failed to update devices:', error);
      if (error instanceof Error) {
        this.log.error(`Error details - Name: ${error.name}, Message: ${error.message}`);
        if (error.stack) {
          this.log.error(`Stack trace:`, error.stack);
        }
      }
    }
  }

  /**
   * Queue an API request to prevent simultaneous calls and rate limiting
   */
  async queueRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await requestFn();
          resolve(result);
          return result;
        } catch (error) {
          reject(error);
          throw error;
        }
      });
      this.processQueue();
    });
  }

  /**
   * Process the request queue sequentially with proper spacing
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (request) {
        try {
          if (this.config.debug) {
            this.log.debug(`[Request Queue] Processing request (${this.requestQueue.length} remaining in queue)`);
          }
          await request();
        } catch (error) {
          this.log.error('[Request Queue] Request failed:', error);
        }
        
        // Add a small delay between requests to prevent overwhelming the API
        if (this.requestQueue.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }

    this.isProcessingQueue = false;
  }
}