import { clone } from '@5qtrs/clone';
import { IText, Text } from '@5qtrs/text';
import { ArgType } from './ArgType';

// -------------------
// Exported Interfaces
// -------------------

export interface IOption {
  name: string;
  aliases?: string[];
  type?: ArgType;
  default?: string;
  defaultText?: IText;
  description?: IText;
  allowMany?: boolean;
}

// ----------------
// Exported Classes
// ----------------

export class Option implements IOption {
  private option: IOption;

  public constructor(option: IOption) {
    this.option = clone(option);
  }

  public get name() {
    return this.option.name;
  }

  public get aliases() {
    return this.option.aliases ? this.option.aliases.slice() : [];
  }

  public get type() {
    return this.option.type || ArgType.string;
  }

  public get default() {
    return this.option.default;
  }

  public get defaultText() {
    return this.option.defaultText || Text.empty();
  }

  public get description() {
    return this.option.description || Text.empty();
  }

  public get allowMany() {
    return this.option.allowMany || false;
  }
}
