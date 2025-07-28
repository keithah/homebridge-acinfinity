import { API } from 'homebridge';

import { PLATFORM_NAME } from './constants';
import { ACInfinityPlatform } from './platform';

export = (api: API) => {
  api.registerPlatform(PLATFORM_NAME, ACInfinityPlatform);
};