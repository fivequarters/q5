export interface IApplicationSettings {
  [property: string]: string | number;
}

export interface INodejsFileSettings {
  [property: string]: string | object;
}

export interface INodejsSettings {
  files: INodejsFileSettings;
}

export interface ILambdaSettings {
  [property: string]: string | number;
}

export interface IFunctionSpecification {
  name: string;
  boundary: string;
  configuration?: IApplicationSettings;
  lambda?: ILambdaSettings;
  nodejs?: INodejsSettings;
  metadata?: { [property: string]: any };
}
