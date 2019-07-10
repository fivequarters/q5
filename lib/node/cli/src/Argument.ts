import { IText, Text } from '@5qtrs/text';
import { ArgType } from './ArgType';

// ------------------
// Internal Functions
// ------------------

function ensureText(text?: IText): Text {
  if (text === undefined) {
    return Text.empty();
  }
  return text instanceof Text ? text : Text.create(text || '');
}

// -------------------
// Exported Interfaces
// -------------------

export interface IArgument {
  name: string;
  type?: ArgType;
  default?: string;
  description?: Text;
  required?: boolean;
}

// ----------------
// Exported Classes
// ----------------

export class Argument implements IArgument {
  private nameProp: string;
  private typeProp: ArgType;
  private defaultProp?: string;
  private descriptionProp: Text;
  private requiredProp: boolean;

  public constructor(argument: IArgument) {
    this.nameProp = argument.name;
    this.typeProp = argument.type || ArgType.string;
    this.defaultProp = argument.default;
    this.descriptionProp = ensureText(argument.description);
    this.requiredProp = argument.required !== undefined ? argument.required : argument.default === undefined;
  }

  public get name() {
    return this.nameProp;
  }

  public get type() {
    return this.typeProp;
  }

  public get default() {
    return this.defaultProp;
  }

  public get description() {
    return this.descriptionProp;
  }

  public get required() {
    return this.requiredProp;
  }
}
