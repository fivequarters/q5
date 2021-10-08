import * as Monaco from 'monaco-editor/esm/vs/editor/editor.api.js';
import * as Superagent from 'superagent';
import semver from 'semver';
import untar from 'js-untar';
import pako from 'pako';
import { IIntegrationComponent } from '@fusebit/schema';
import { IRegistryInfo } from './Server';

export interface IPackage {
  name: string;
  version: string;
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

export interface IDownloadedTypes {
  files: IDownloadedFile[];
  maxSatisfyingVersion: string;
  mainFolder: string;
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

export function resolveMainFolderFromPackage(mainFolder: string): string {
  return mainFolder ? `/${mainFolder.split('/')[0]}` : '';
}

/**
 * Download and extract package contents from Fusebit internal registry
 */
export async function downloadAndExtractInternalPackage(
  packageInfo: IInternalPackage,
  sdkStatements: ISdkStatement[],
  fallbackToDefinitelyTyped = true,
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

    // Handle package redirect to download the tarball from a signed S3 File
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
          for (const dependency in dependencies) {
            downloadAndInstallTypes(
              dependency,
              dependencies[dependency],
              packageInfo.registry,
              sdkStatements,
              fallbackToDefinitelyTyped,
              settings
            );
          }
        }
      }

      const packageTypeFiles: IExtractedFile[] = filterTypeDefinitionFiles(extractedFiles);
      for (const typeFile of packageTypeFiles) {
        const typePath = `file:///node_modules/${packageInfo.name}${typeFile.name.replace('package/libc', '')}`;
        let fileContent = new TextDecoder().decode(new DataView(typeFile.buffer));
        // Special case for framework only: Inject dynamic typings for SDK methods by extending Tenant class Typings, defined at Integration.d.ts
        if (
          packageInfo.name === '@fusebit-int/framework' &&
          typeFile.name.includes('client/Integration.d.ts') &&
          sdkStatements?.length
        ) {
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
    if (FUSEBIT_INT_PACKAGE_REGEX.test(packageInfo.name)) {
      throw new Error('Unexpected usage, please use downloadAndExtractInternalPackage');
    }
    const typingsFiles = await getTypingsFilesFromCDN(packageInfo, settings);
    if (typingsFiles) {
      // If no typings found, try to load them from DefinitelyTyped
      if (!typingsFiles.files.length && fallbackToDefinitelyTyped) {
        await downloadPackageFromDefinitelyTyped(packageInfo, typingsFiles.mainFolder, settings);
      } else {
        await downloadAndInjectTypeFiles(packageInfo, typingsFiles.files, typingsFiles.mainFolder, settings);
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
  mainFolder: string,
  settings: IDownloadPackageSettings = { requestTimeout: 60000 }
): Promise<void> {
  try {
    const packageFromDT = { ...packageInfo, name: `@types/${packageInfo.name}` };
    const maxSatisfyingVersion = await resolvePackageMaxSatisfyingVersion(packageFromDT, settings);
    if (maxSatisfyingVersion) {
      // Override the package to fetch (@types instead of the original package)
      packageFromDT.version = maxSatisfyingVersion;
      const typingsFiles = await getTypingsFilesFromCDN(packageFromDT, settings);
      if (typingsFiles) {
        downloadAndInjectTypeFiles(packageFromDT, typingsFiles.files, mainFolder, settings);
      }
    }
  } catch (e) {
    console.warn(`Unable to install @types for package ${packageInfo.name}@${packageInfo.version}`, e);
  }
}

/**
 * Get package files from CDN and injects Types files to the editor
 */
async function downloadAndInjectTypeFiles(
  packageInfo: IPackage,
  files: IDownloadedFile[],
  mainFolder: string,
  settings: IDownloadPackageSettings = { requestTimeout: 60000 }
): Promise<void> {
  for await (const file of files) {
    const path = `${PUBLIC_CDN_URL}${packageInfo.name}@${packageInfo.version}${file.name}`;
    const response = await Superagent.get(path).timeout(settings.requestTimeout);
    const typingsPath = `file:///node_modules/${packageInfo.name}${file.name.replace(mainFolder, '')}`;
    const contents = response.text;
    if (contents && file.name !== '/package.json') {
      Monaco.languages.typescript.javascriptDefaults.addExtraLib(contents, typingsPath);
    }
  }
}

async function resolvePackageMaxSatisfyingVersion(
  packageInfo: IPackage,
  settings: IDownloadPackageSettings = { requestTimeout: 60000 }
): Promise<string | undefined> {
  const versionsPath = `${PUBLIC_CDN_API_URL}${packageInfo.name}`;
  const packageVersions = await Superagent.get(versionsPath).timeout(settings.requestTimeout);
  if (packageVersions) {
    let maxSatisfyingVersion = semver.maxSatisfying(packageVersions.body?.versions, packageInfo.version);
    // If not satisfying version is found, use latest available version
    if (!maxSatisfyingVersion) {
      maxSatisfyingVersion = (packageVersions.body?.versions || [])[0];
    }
    return maxSatisfyingVersion?.toString();
  }
}

/**
 * Get a list of Typings files to download from CDN
 * It will use semver to resolve the max satisfying version to use.
 */
async function getTypingsFilesFromCDN(
  packageInfo: IPackage,
  settings: IDownloadPackageSettings = { requestTimeout: 60000 }
): Promise<IDownloadedTypes | undefined> {
  const maxSatisfyingVersion = await resolvePackageMaxSatisfyingVersion(packageInfo, settings);
  if (maxSatisfyingVersion) {
    const packagePath = `${PUBLIC_CDN_API_URL}${packageInfo.name}@${maxSatisfyingVersion}/flat`;
    const response = await Superagent.get(packagePath).timeout(settings.requestTimeout);
    const packageJson = await Superagent.get(
      `${PUBLIC_CDN_URL}${packageInfo.name}@${maxSatisfyingVersion}/package.json`
    );
    const { main } = JSON.parse(packageJson.text || packageJson.body.toString());

    const packageTypeFiles: IDownloadedFile[] = filterTypeDefinitionFiles(response.body?.files);
    return {
      files: packageTypeFiles,
      maxSatisfyingVersion: maxSatisfyingVersion,
      mainFolder: resolveMainFolderFromPackage(main),
    };
  }
}

export async function downloadAndInstallTypes(
  name: string,
  version: string,
  registry: IRegistryInfo,
  sdkStatements: ISdkStatement[],
  fallbackToDefinitelyTyped = true,
  settings: IDownloadPackageSettings = { requestTimeout: 60000 }
): Promise<void> {
  // Resolve internal fusebit packages
  if (FUSEBIT_INT_PACKAGE_REGEX.test(name)) {
    downloadAndExtractInternalPackage(
      {
        name,
        version,
        registry,
      },
      sdkStatements,
      fallbackToDefinitelyTyped,
      settings
    );
  } else {
    downloadPackageFromCDN({ name, version }, fallbackToDefinitelyTyped, settings);
  }
}

function buildSdkByTenantType(sdk?: ISdkStatement): string {
  return ` /**
  * Get an authenticated ${sdk?.integrationType || ''} SDK for the specified Connector, using a given Tenant ID
  *
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
  }, tenantId: string):Promise<${sdk?.importName || 'any'}>;
  
  /**
   * Get an authenticated SDK for the specified Connector, using a given Install
   *
   * @param ctx The context object provided by the route function
   * @param {string} connectorName The name of the Connector from the service to interact with
   * @param {string} installId The identifier of the Install to get the associated Connector
   * @returns {Promise<${sdk?.importName || 'any'}>} Returns an authenticated SDK you would use to interact with the
   * Connector service on behalf of your user
   */
    getSdk(ctx: RouterContext, connectorName: ${
      sdk?.connectorName ? `'${sdk.connectorName}'` : 'string'
    }, installId: string): Promise<${sdk?.importName || 'any'}>
    
  `;
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
