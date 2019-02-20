import { clone } from '@5qtrs/clone';

export type ConfigValue = string | number | boolean | RegExp | Date | null;
export interface IConfigSettings {
  [index: string]: ConfigValue;
}

export class Config {
  private settings: IConfigSettings;

  public constructor(settings: IConfigSettings) {
    this.settings = clone(settings);
  }

  public value(settingName: string): ConfigValue {
    return this.settings[settingName];
  }
}
