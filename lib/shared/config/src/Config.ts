import { clone } from '@5qtrs/clone';

// --------------
// Exported Types
// --------------

export type ConfigValue = string | number | boolean | RegExp | Date | null | undefined;

// -------------------
// Exported Interfaces
// -------------------

export interface IConfigSettings {
  [index: string]: ConfigValue;
}

export interface IConfig {
  value(settingsName: string): ConfigValue;
}

// ----------------
// Exported Classes
// ----------------

export class Config {
  private settings: IConfigSettings;

  public constructor(settings: IConfigSettings) {
    this.settings = clone(settings);
  }

  public value(settingName: string): ConfigValue {
    return this.settings ? this.settings[settingName] : undefined;
  }
}
