import { join, sep } from 'path';

export default class WorkspaceInfo {
  public get Org() {
    return this.org;
  }

  public get Name() {
    return this.name;
  }

  public get FullName() {
    return this.fullName;
  }

  public get Location() {
    return this.location;
  }

  public static Create(org: string, name: string, location?: string) {
    const index = name.indexOf('/');
    const hasForwardSlash = index !== -1;
    const hasAt = name[0] === '@';

    if (hasForwardSlash !== hasAt) {
      throw new Error(`The workspace name '${name}' is invalid`);
    }

    if (hasAt) {
      org = name.substring(1, index);
      name = name.substring(index + 1);
    }

    if (org[0] === '@') {
      org = org.substring(1);
    }

    org = org.toLowerCase();
    name = name.toLowerCase();

    if (typeof location === 'string') {
      const pathSegments = location.split(sep);
      const lastSegment = pathSegments[pathSegments.length - 1];
      if (lastSegment === '.') {
        location = name;
      } else if (lastSegment.toLowerCase() !== name) {
        location = join(location, name);
      }
    }
    return new WorkspaceInfo(org, name, location);
  }
  private org: string;
  private name: string;
  private fullName: string;
  private location: string;

  private constructor(org: string, name: string, location?: string) {
    this.org = org;
    this.name = name;
    this.location = location || '';
    this.fullName = org ? `@${org}/${name}` : name;
  }
}
