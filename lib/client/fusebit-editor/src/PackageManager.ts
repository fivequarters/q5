import * as Monaco from 'monaco-editor/esm/vs/editor/editor.api.js';
import * as Superagent from 'superagent';
import semver from 'semver';
import untar from 'js-untar';
import pako from 'pako';
import { IIntegrationComponent } from '@fusebit/schema';

export interface IPackage {
  name: string;
  version: string;
}

export interface IRegistryInfo {
  baseUrl: string;
  token: string;
}

export interface IInternalPackage extends IPackage {
  registry: IRegistryInfo;
}

export interface IProviderPackage {
  name: string;
  lib: string;
  sdk: string;
  integrationType: string;
}

export interface IDownloadPackageSettings {
  requestTimeout: number;
}

export interface ISdkStatement {
  importName: string;
  library: string;
  connectorName: string;
  integrationType: string;
}

export interface IDownloadedFile {
  name: string;
}

export interface IExtractedFile extends IDownloadedFile {
  buffer: ArrayBuffer;
}

export interface IConnectorComponent {
  name: string;
  provider: string;
}

export const SDK_PACKAGE_PROVIDER_CDN_MAPPINGS: Record<string, IProviderPackage> = {
  '@fusebit-int/slack-provider': {
    name: '@slack/web-api',
    lib: 'dist',
    sdk: 'WebClient',
    integrationType: 'Slack',
  },
  '@fusebit-int/hubspot-provider': {
    name: '@hubspot/api-client',
    lib: 'lib',
    sdk: 'Client',
    integrationType: 'HubSpot',
  },
  '@fusebit-int/linear-provider': {
    name: '@linear/sdk',
    lib: 'dist',
    sdk: 'LinearClient',
    integrationType: 'Linear',
  },
  '@fusebit-int/salesforce-provider': {
    name: 'jsforce',
    lib: 'lib',
    sdk: 'jsforce',
    integrationType: 'Salesforce',
  },
};

// Common names used in package distribution
export const COMMON_DIST_DIR_NAMES = ['/build', '/lib', '/dist'];

export const PUBLIC_CDN_API_URL = 'https://data.jsdelivr.com/v1/package/npm/';

export const PUBLIC_CDN_URL = 'https://cdn.jsdelivr.net/npm/';

export const FUSEBIT_INT_PACKAGE_PROVIDER_REGEX = new RegExp(/@fusebit-int\/(.*?)-provider$/);

export const FUSEBIT_INT_PACKAGE_REGEX = new RegExp(/@fusebit-int\/(.*?)/);

/**
 * Removes caret (^) and tilde (~) from version
 */
export function cleanVersion(version: string): string {
  return version.replace('^', '').replace('~', '');
}

/**
 * Filter .d.ts files only
 */
export function filterTypeDefinitionFiles<T>(files: IDownloadedFile[]): T[] {
  return (files?.filter(
    (file: IDownloadedFile) => file.name.includes('.d.ts') && !file.name.includes('.map')
  ) as unknown) as T[];
}

/**
 * Download and extract package contents from Fusebit internal registry
 */
export async function downloadAndExtractInternalPackage(
  packageInfo: IInternalPackage,
  sdkStatements: ISdkStatement[],
  settings: IDownloadPackageSettings = { requestTimeout: 60000 }
): Promise<void> {
  try {
    // Clean the package version just in case contains an invalid version to fetch from the registry (this only applies for internal packages)
    const packageUrl = `${packageInfo.registry.baseUrl}${packageInfo.name}/-/${packageInfo.name}@${cleanVersion(
      packageInfo.version
    )}`;
    const packageAbortController = new AbortController();
    const packageFetchTimeoutId = setTimeout(() => packageAbortController.abort(), settings.requestTimeout);
    const response = await fetch(packageUrl, {
      headers: {
        Authorization: `Bearer ${packageInfo.registry.token}`,
      },
      signal: packageAbortController.signal,
    });

    clearTimeout(packageFetchTimeoutId);

    //Handle package redirect to download the tarball from a signed S3 File
    if (response.redirected) {
      const tarballResponse: Superagent.Response = await Superagent.get(response.url)
        .responseType('arraybuffer')
        .timeout(settings.requestTimeout);
      const extractedFiles = await untar(pako.inflate(tarballResponse.body).buffer);
      // Save some bandwidth, download only deps for the provider dependencies.
      if (FUSEBIT_INT_PACKAGE_PROVIDER_REGEX.test(packageInfo.name)) {
        const packageJson = extractedFiles.find((file: IExtractedFile) => file.name == 'package/package.json');
        if (packageJson) {
          const packageJsonContent = new TextDecoder().decode(new DataView(packageJson.buffer));
          const { dependencies } = JSON.parse(packageJsonContent);
          if (dependencies) {
            const dependenciesKeys = Object.keys(dependencies);
            for (const dependency of dependenciesKeys) {
              downloadPackageFromCDN({
                name: dependency,
                version: dependencies[dependency],
              });
            }
          }
        }
      }

      const packageTypeFiles: IExtractedFile[] = filterTypeDefinitionFiles(extractedFiles);
      for (const typeFile of packageTypeFiles) {
        const typePath = `file:///node_modules/${packageInfo.name}${typeFile.name.replace('package/libc', '')}`;
        let fileContent = new TextDecoder().decode(new DataView(typeFile.buffer));
        // Inject dynamic typings for SDK methods.
        if (typeFile.name.includes('client/Integration.d.ts') && sdkStatements?.length) {
          fileContent = getDynamicSdkTypings(fileContent, sdkStatements);
        }
        Monaco.languages.typescript.javascriptDefaults.addExtraLib(fileContent, typePath);
      }
    } else {
      throw new Error(`302 Redirect response expected for downloading typings for package ${packageInfo.name}`);
    }
  } catch (e) {
    console.warn(`Unable to install typings for package ${packageInfo.name}`, e);
  }
}

/**
 * Removes package distribution folder name from common used names (i.e lib, dist)
 * @param fileName
 * @returns string
 */
export function cleanDistFolder(fileName: string): string {
  let cleanName = fileName;
  COMMON_DIST_DIR_NAMES.forEach((commonName) => (cleanName = cleanName.replace(commonName, '')));
  return cleanName;
}

/**
 * Downloads npm package typings from public CDN.
 * Typings are injected automatically
 * If package types are not defined, will try to get them from DefinitelyTyped (enabled by default)
 */
export async function downloadPackageFromCDN(
  packageInfo: IPackage,
  fallbackToDefinitelyTyped = true,
  settings: IDownloadPackageSettings = { requestTimeout: 60000 }
): Promise<void> {
  try {
    // Try to find typings from the package
    const versionsPath = `${PUBLIC_CDN_API_URL}${packageInfo.name}`;
    const packageVersions = await Superagent.get(versionsPath).timeout(settings.requestTimeout);

    if (packageVersions) {
      let maxSatisfyingVersion = semver.maxSatisfying(packageVersions.body?.versions, packageInfo.version);
      // If not satisfying version is found, use latest available version
      if (!maxSatisfyingVersion) {
        maxSatisfyingVersion = (packageVersions.body?.versions || [])[0];
      }
      const packagePath = `${PUBLIC_CDN_API_URL}${packageInfo.name}@${maxSatisfyingVersion}/flat`;
      const response = await Superagent.get(packagePath).timeout(settings.requestTimeout);
      const packageTypeFiles: any[] = filterTypeDefinitionFiles(response.body?.files);
      // If no typings found, try to load them from DefinitelyTyped
      if (!packageTypeFiles.length && fallbackToDefinitelyTyped) {
        downloadPackageFromDefinitelyTyped(packageInfo, settings);
      } else {
        for await (const file of packageTypeFiles) {
          const path = `${PUBLIC_CDN_URL}${packageInfo.name}@${packageInfo.version}${file.name}`;
          const response = await Superagent.get(path).timeout(settings.requestTimeout);
          const typingsPath = `file:///node_modules/${packageInfo.name}${cleanDistFolder(file.name)}`;
          const contents = response.text || response.body.toString();
          if (contents) {
            Monaco.languages.typescript.javascriptDefaults.addExtraLib(contents, typingsPath);
          }
        }
      }
    }
  } catch (e) {
    console.warn(`Unable to install typings for package ${packageInfo.name}`, e);
  }
}

/**
 * Downloads npm package typings from @types project
 * Typings are injected automatically
 * The version used will be the max satisfying value following semver spec.
 * If no version is found, it will fallback to latest version.
 */
export async function downloadPackageFromDefinitelyTyped(
  packageInfo: IPackage,
  settings: IDownloadPackageSettings = { requestTimeout: 60000 }
): Promise<void> {
  try {
    const versions = `${PUBLIC_CDN_API_URL}@types/${packageInfo.name}`;
    const packageVersions = await Superagent.get(`${versions}`).timeout(settings.requestTimeout);

    if (packageVersions) {
      let maxSatisfyingVersion = semver.maxSatisfying(packageVersions.body?.versions, packageInfo.version);
      // If not satisfying version is found, use latest available version
      if (!maxSatisfyingVersion) {
        maxSatisfyingVersion = (packageVersions.body?.versions || [])[0];
      }
      if (maxSatisfyingVersion) {
        const packagePath = `${PUBLIC_CDN_API_URL}@types/${packageInfo.name}@${maxSatisfyingVersion}/flat`;
        const response = await Superagent.get(packagePath).timeout(settings.requestTimeout);
        const packageTypeFiles: any[] = filterTypeDefinitionFiles(response.body?.files);
        //Override the package to fetch (@types instead of the original package)
        packageInfo.name = `@types/${packageInfo.name}`;
        packageInfo.version = maxSatisfyingVersion.toString();

        for await (const file of packageTypeFiles) {
          const path = `${PUBLIC_CDN_URL}${packageInfo.name}@${packageInfo.version}${file.name}`;
          const response = await Superagent.get(path).timeout(settings.requestTimeout);
          const typingsPath = `file:///node_modules/${packageInfo.name}${cleanDistFolder(file.name)}`;
          const contents = response.text || response.body.toString();
          if (contents) {
            Monaco.languages.typescript.javascriptDefaults.addExtraLib(contents, typingsPath);
          }
        }
      }
    }
  } catch (e) {
    console.warn(`Unable to install @types for package ${packageInfo.name}@${packageInfo.version}`, e);
  }
}

function buildSdkByTenantType(sdk?: ISdkStatement): string {
  return ` /**
  * Get an authenticated ${sdk?.integrationType || ''} SDK for the specified Connector, using a given Tenant ID
  * @param ctx The context object provided by the route function
  * @param {string} connectorName The name of the Connector from the service to interact with
  * @param {string} tenantId Represents a single user of this Integration,
  * usually corresponding to a user or account in your own system
  * @returns Promise<${sdk?.importName || 'any'}> Returns an authenticated ${
    sdk?.integrationType || ''
  } SDK you would use to interact with the
  * Connector service on behalf of your user
  */
  getSdkByTenant(ctx: RouterContext, connectorName: ${
    sdk?.connectorName ? `'${sdk.connectorName}'` : 'string'
  }, tenantId: string):Promise<${sdk?.importName || 'any'}>;`;
}

/**
 * Compose a type declaration file for each defined Connector
 */
function getDynamicSdkTypings(contents: string, sdks: ISdkStatement[]) {
  return `
    ${sdks.map((sdk: ISdkStatement) => {
      return `import { ${sdk.importName} } from '${sdk.library}';`;
    })}

    declare interface Tenant {

        ${sdks.map((sdk: ISdkStatement) => {
          `import { ${sdk.importName} } from '${sdk.library}';`;
        })}

        ${sdks.map((sdk: ISdkStatement) => {
          return buildSdkByTenantType(sdk);
        })}

        ${buildSdkByTenantType()}  
    }
    ${contents}
   `;
}

/**
 * Creates SDK statements Models used to enhance IntelliSense of the return type
 * of SDK functions depending of the Connector type (i.e Slack, HubSpot, etc)
 * @param dependencies List of package dependencies
 * @param components  Components defined in fusebit.json
 * @returns ISdkStatement[]
 */
export function buildSdkStatementsTree(
  dependencies: { [property: string]: string },
  components: IIntegrationComponent[]
): ISdkStatement[] {
  const statementsTree: ISdkStatement[] = [];
  for (const name in dependencies) {
    const providerPackageDependency = SDK_PACKAGE_PROVIDER_CDN_MAPPINGS[name];
    if (providerPackageDependency) {
      const connectorComponent = components.find((component) => component.provider == name);
      if (connectorComponent) {
        statementsTree.push({
          importName: providerPackageDependency.sdk,
          library: providerPackageDependency.name,
          connectorName: connectorComponent.name,
          integrationType: providerPackageDependency.integrationType,
        });
      }
    }
  }

  return statementsTree;
}
