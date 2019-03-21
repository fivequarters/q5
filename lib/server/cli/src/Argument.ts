import { clone } from '@5qtrs/clone';
import { IText, Text } from '@5qtrs/text';
import { ArgType } from './ArgType';

// -------------------
// Exported Interfaces
// -------------------

export interface IArgument {
  name: string;
  type?: ArgType;
  default?: string;
  description?: IText;
  required?: boolean;
}

// ----------------
// Exported Classes
// ----------------

export class Argument implements IArgument {
  private argument: IArgument;

  public constructor(argument: IArgument) {
    this.argument = clone(argument);
  }

  public get name() {
    return this.argument.name;
  }

  public get type() {
    return this.argument.type || ArgType.string;
  }

  public get default() {
    return this.argument.default;
  }

  public get description() {
    return this.argument.description || Text.empty();
  }

  public get required() {
    if (this.argument.required !== undefined) {
      return this.argument.required;
    }
    return this.default === undefined;
  }
}
