export interface IRegistryStore {
  // Load the existing entry
  // Add the _attachments field to it
  // Add the versions field to it
  // Save it, validating etag

  put: (key: any, version: any, payload: any) => number;
  get: (key: any) => any;
  tarball: (key: any) => any;
  search: (keywords: string[]) => any;
}
