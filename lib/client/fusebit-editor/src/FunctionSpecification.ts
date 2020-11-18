/**
 * List of files making up the Node.js function. Each key represents the file name, and the value content of the file.
 * The value may be a string or a JavaScript object which will be JSON-serialized to arrive at the file content.
 *
 * At minimum you must specify the `index.js` file. Commonly specified is also `package.json`, which can be used to select
 * the Node.js version and list npm module dependencies.
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
 * Specification of a single function. Used when creating a [[EditorContext]].
 *
 * Example of a simple function specification:
 *
 * ```javascript
 * {
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
   * A serialized version of the configuration that can include comments (lines starting with '#') and key values in the form of {key}={value}
   */
  configurationSerialized?: string;
  /**
   * Not part of MVP
   * @ignore
   */
  computeSerialized?: string;
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
   * A serialized version of the schedule that can include comments (lines starting with '#') and key values in the form of {key}={value}
   */
  scheduleSerialized?: string;

  /*
   * Permissions that the function will execute under.
   */
  functionPermissions?: { allow: [{ action: string; resource: string }] };
}
