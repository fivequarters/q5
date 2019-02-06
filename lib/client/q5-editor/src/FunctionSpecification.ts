export interface ApplicationSettings {
    [property: string]: string | number;
}

export interface NodejsFileSettings {
    [property: string]: string | Object;
}

export interface NodejsSettings {
    files: NodejsFileSettings;
}

export interface LambdaSettings {
    [property: string]: string | number;
}

export interface FunctionSpecification {
    name: string;
    boundary: string;
    configuration?: ApplicationSettings;
    lambda?: LambdaSettings;
    nodejs?: NodejsSettings;
    metadata?: { [property: string] : any };
}
