import * as Monaco from 'monaco-editor/esm/vs/editor/editor.api.js';
import * as Superagent from 'superagent';

Monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
  noSemanticValidation: true,
  noSyntaxValidation: false,
});

Monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
  target: Monaco.languages.typescript.ScriptTarget.Latest,
  allowNonTsExtensions: true,
  allowJs: true,
  moduleResolution: Monaco.languages.typescript.ModuleResolutionKind.NodeJs,
  module: Monaco.languages.typescript.ModuleKind.CommonJS,
  noEmit: true,
  typeRoots: ['node_modules/@types'],
});

let lastStaticTypings: Monaco.IDisposable | undefined;

export function addStaticTypings() {
  if (lastStaticTypings) {
    return;
  }
  const StaticTypings = `
declare class FusebitCallbackResult {
  /**
   * HTTP response body. Must be JSON-serializable.
   */
  body?: any;
  /**
   * HTTP response headers.
   */
  headers?: { [ property: string ]: string };
  /**
   * HTTP response status code. HTTP 200 is sent if a status code is not specified.
   */
  status?: number;
}

type FusebitCallback = (error?: Error, result?: FusebitCallbackResult) => void;
`;
  lastStaticTypings = Monaco.languages.typescript.javascriptDefaults.addExtraLib(
    StaticTypings,
    'FusebitStaticTypes.d.ts'
  );
}

let lastConfigurationSettings: string | undefined;
let lastFusebitContextTypings: Monaco.IDisposable | undefined;

export function updateFusebitContextTypings(configuration: { [index: string]: string | number }) {
  let newConfigurationSettings = Object.keys(configuration).sort().join(':');
  if (newConfigurationSettings !== lastConfigurationSettings) {
    const FusebitContextType = `declare class FusebitContext {
      /**
       * Body of the request.
       */
      body: any;
      /**
       * URL query parameters of the request.
       */
      query: { [ property: string ]: string };
      /**
       * HTTP request headers of the request.
       */
      headers: { [ property: string ]: string };
      /**
       * HTTP request method, or 'CRON' if the function is called by the scheduler.
       */
      method: string;
      /**
       * The version-less HTTP request path of the function.
       */
      url: string;
      /**
       * Fusebit function account id.
       */
      accountId: string;
      /**
       * Fusebit function subscription id.
       */
      subscriptionId: string;
      /**
       * Fusebit function boundary id.
       */
      boundaryId: string;
      /**
       * Fusebit function id.
       */
      functionId: string;
      /**
       * The HTTP endpoint for this function.
       */
      baseUrl: string;
      /**
       * The route within the function that has been requested, including any path elements that occur after
       * the baseUrl in the HTTP request but not query string parameters.
       */
      path: string;
      fusebit: {
        /**
         * The Fusebit access token with permissions specified at function creation.
         */
        functionAccessToken?: string,
        /**
         * The access token provided by the caller when invoking this function.
         */
        callerAccessToken?: string
        /**
         * The endpoint of the Fusebit platform serving this function.
         */
        endpoint: string
      };
      /**
       * Permissions that the caller has been validated to have.
       */
      caller: { permissions?: { allow: [ {action: string, resource: string } ] } };
      /**
       * Configuration settings of the function.
       */
      configuration: { ${Object.keys(configuration)
        .map((k) => `${k}: string;`)
        .join(' ')} };
    }`;

    lastConfigurationSettings = newConfigurationSettings;
    if (lastFusebitContextTypings) {
      lastFusebitContextTypings.dispose();
      lastFusebitContextTypings = undefined;
    }
    lastFusebitContextTypings = Monaco.languages.typescript.javascriptDefaults.addExtraLib(
      FusebitContextType,
      'FusebitContext.d.ts'
    );
  }
}

let lastNodejsVersion: string | undefined;
let lastNodejsTypings: Monaco.IDisposable | undefined;

export function updateNodejsTypings(version: string) {
  if (lastNodejsVersion === version) {
    return;
  }
  lastNodejsVersion = version;
  if (lastNodejsTypings) {
    lastNodejsTypings.dispose();
    lastNodejsTypings = undefined;
  }

  getCdnTypes('node', version).then((res) => {
    lastNodejsTypings = Monaco.languages.typescript.javascriptDefaults.addExtraLib(
      res.text,
      'node_modules/@types/node/index.d.ts'
    );
  });
}

let dependencyTypings: { [property: string]: { version: string; typings: Monaco.IDisposable | undefined } } = {};

export function updateDependencyTypings(dependencies: { [property: string]: string }) {
  for (var name in dependencies) {
    if (dependencyTypings[name] && dependencyTypings[name].version === dependencies[name]) {
      continue;
    }
    dependencyTypings[name] = dependencyTypings[name] || {};
    dependencyTypings[name].version = dependencies[name];
    if (dependencyTypings[name].typings) {
      (dependencyTypings[name].typings as Monaco.IDisposable).dispose();
      dependencyTypings[name].typings = undefined;
    }
    downloadAndInstallTypes(name, dependencies[name]);
  }

  function downloadAndInstallTypes(name: string, version: string) {
    getCdnTypes(name, version).then((res: Superagent.Response) => {
      dependencyTypings[name].typings = Monaco.languages.typescript.javascriptDefaults.addExtraLib(
        res.text,
        `file:///node_modules/@types/${name}/index.d.ts`
        // `node_modules/${name}/index.d.ts`
      );
    });
  }
}

function getCdnTypes(name: string, version: string): Promise<Superagent.Response> {
  const jsdelvr = `https://cdn.jsdelivr.net/npm/@types/${name}@${version}/index.d.ts`;
  const unpkg = `https://unpkg.com/@types/${name}@${version}/index.d.ts`;
  const cdns = [jsdelvr, unpkg];

  const cdnPromise: Promise<Superagent.Response> = new Promise((resolve, reject) => {
    const promise = Promise.reject();
    cdns.forEach((cdn) => promise.catch(() => Superagent.get(cdn)));
    promise.then(resolve);
    promise.catch(reject);
  });

  cdnPromise.catch((e) => {
    console.error(`Unable to install typings for module ${name}@${version}:`, e);
    throw e;
  });

  return cdnPromise;
}
