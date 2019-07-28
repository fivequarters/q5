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
  private nameProp: string;
  private aliasesProp: string[];
  private typeProp: ArgType;
  private defaultProp?: string;
  private defaultTextProp: Text;
  private descriptionProp: Text;
  private allowManyProp: boolean;

  public constructor(option: IOption) {
    this.nameProp = option.name;
    this.aliasesProp = option.aliases ? option.aliases.slice() : [];
    this.typeProp = option.type || ArgType.string;
    this.defaultProp = option.default;
    this.defaultTextProp = ensureText(option.defaultText);
    this.descriptionProp = ensureText(option.description);
    this.allowManyProp = option.allowMany || false;
  }

  public get name() {
    return this.nameProp;
  }

  public get aliases() {
    return this.aliasesProp;
  }

  public get type() {
    return this.typeProp;
  }

  public get default() {
    return this.defaultProp;
  }

  public get defaultText() {
    return this.defaultTextProp;
  }

  public get description() {
    return this.descriptionProp;
  }

  public get allowMany() {
    return this.allowManyProp;
  }
}
