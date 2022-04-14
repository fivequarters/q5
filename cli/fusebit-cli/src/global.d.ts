declare global {
  namespace NodeJS {
    interface Global {
      COMMAND_MODE: string;
    }
  }
  var Config: {
    COMMAND_MODE: string;
  };
  var COMMAND_MODE: string;
}

declare var COMMAND_MODE: string;

export {};
