// ------------------
// Internal Constants
// ------------------

const defaultCode = 'unknown';

// ----------------
// Exported Classes
// ----------------

export class Exception extends Error {
  private codeProp: string;
  private paramsProp?: any[];
  private innerProp?: Exception;

  public constructor(code?: string, message?: string, params?: any[], inner?: Error | Exception) {
    super(message);
    this.codeProp = code || defaultCode;
    this.paramsProp = params;

    if (inner) {
      this.innerProp = inner instanceof Exception ? inner : new Exception(defaultCode, inner.message);
    }
  }

  public get code(): string {
    return this.codeProp;
  }

  public get message(): string {
    return super.message;
  }

  public get stack(): string | undefined {
    return super.stack;
  }

  public get params(): any[] {
    return this.paramsProp ? this.paramsProp.slice() : [];
  }

  public get inner(): Exception | undefined {
    return this.innerProp;
  }
}
