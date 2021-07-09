/**
 * List of files making up the Node.js function. Each key represents the file name, and the value content of the file.
 * The value may be a string or a JavaScript object which will be JSON-serialized to arrive at the file content.
 *
 * At minimum you must specify the `index.js` file. Commonly specified is also `package.json`, which can be
 * used to select the Node.js version and list npm module dependencies.
 */
export interface INodejsFileSettings {
  [property: string]: string | object;
}
