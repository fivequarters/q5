import { clone } from '@5qtrs/clone';

export type ConfigValue = string | number | boolean | RegExp | Date | null;
export type ConfigSettings = { [index: string]: ConfigValue };

export class Config {
  private settings: ConfigSettings;

  public constructor(settings: ConfigSettings) {
    this.settings = clone(settings);
  }

  public value(settingName: string): ConfigValue {
    return this.settings[settingName];
  }
}
