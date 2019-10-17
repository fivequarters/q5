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
  if (lastStaticTypings) return;
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
  let newConfigurationSettings = Object.keys(configuration)
    .sort()
    .join(':');
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
       * HTTP request url.
       */
      url: string;
      /**
       * Fusebit function boundary id.
       */
      boundaryId: string;
      /**
       * Fusebit function id.
       */
      functionId: string;
      /**
       * Configuration settings of the function.
       */
      configuration: { ${Object.keys(configuration)
        .map(k => `${k}: string;`)
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

  Superagent.get(`https://unpkg.com/@types/node@${version}/index.d.ts`)
    .then(res => {
      lastNodejsTypings = Monaco.languages.typescript.javascriptDefaults.addExtraLib(
        res.text,
        'node_modules/@types/node/index.d.ts'
      );
    })
    .catch(e => {
      console.error(`Unable to install typings for Node.js version ${version}:`, e);
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
    Superagent.get(`https://unpkg.com/@types/${name}@${version}/index.d.ts`)
      .then(res => {
        dependencyTypings[name].typings = Monaco.languages.typescript.javascriptDefaults.addExtraLib(
          res.text,
          `file:///node_modules/@types/${name}/index.d.ts`
          // `node_modules/${name}/index.d.ts`
        );
      })
      .catch(e => {
        console.error(`Unable to install typings for module ${name}@${version}:`, e);
      });
  }
}
