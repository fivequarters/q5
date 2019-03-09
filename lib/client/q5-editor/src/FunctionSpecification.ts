/**
 * Set of key value pairs that define application settings of the function.
 * Application settings are stored encrypted at rest and only
 * made available to the function at the time of execution. Good storage place for API keys, connections strings, and other
 * sensitive information.
 */
export interface IApplicationSettings {
  [property: string]: string | number;
}

/**
 * List of files making up the Node.js function. Each key represents the file name, and the value content of the file.
 * The value may be a string or a JavaScript object which will be JSON-serialized to arrive at the file content.
 *
 * At minimum you must specify the `index.js` file. Commonly specified is also `package.json`, which can be used to select
 * the Node.js version and list NPM module dependencies.
 */
export interface INodejsFileSettings {
  [property: string]: string | object;
}

/**
 * Settings that define all artifacts describing a Node.js function. Currently this is just the list of files.
 */
export interface INodejsSettings {
  /**
   * Files making up the Node.js function.
   */
  files: INodejsFileSettings;
}

/**
 * Not part of MVP
 * @ignore
 */
export interface ILambdaSettings {
  [property: string]: string | number;
}

/**
 * Cron job schedule
 */
export interface ISchedule {
  cron: string;
  timezone?: string;
  [property: string]: string | number | undefined;
}

/**
 * Specification of a single function. Used when creating a [[Workspace]].
 *
 * Example of a simple function specification:
 *
 * ```javascript
 * {
 *   boundary: 'myboundary',
 *   name: 'myname',
 *   nodejs: {
 *     files: {
 *       'index.js': 'module.exports = (ctx, cb) => cb(null, { body: "hello" });',
 *       'package.json': { dependencies: { async: '*' }},
 *     }
 *   },
 *   configuration: {
 *     MY_API_KEY: 'abc!123'
 *   }
 * }
 * ```
 */
export interface IFunctionSpecification {
  /**
   * Name of the function, unique within the boundary.
   */
  name: string;
  /**
   * Isolation boundary within which this function executes. Functions running in different boundaries are guaranteed to be isolated.
   * Functions running in the same boundary may or may not be isolated.
   */
  boundary: string;
  /**
   * Application settings of the function. Application settings are key value pairs stored encrypted at rest and only
   * made available to the function at the time of execution. Good storage place for API keys, connections strings, and other
   * sensitive information.
   */
  configuration?: IApplicationSettings;
  /**
   * Not part of MVP
   * @ignore
   */
  lambda?: ILambdaSettings;
  /**
   * Node.js source code of the function.
   */
  nodejs?: INodejsSettings;
  /**
   * Arbitrary metadata associated with the function. This is stored alongside the function specification on the server,
   * but does not affect the behavior of the server. This is a useful place for client side tooling to durably store metadata
   * useful during function development.
   */
  metadata?: { [property: string]: any };
  /**
   * If the function is a CRON job, this property defines the execution schedule. If absent, the function is not a CRON job.
   */
  schedule?: ISchedule;
}
