// ------------------
// Internal Constants
// ------------------

const delimiter = '/';

// ----------------
// Exported Classes
// ----------------

export class Resource {
  public static normalize(resource: string) {
    const rootSlash = resource[0] === delimiter ? '' : delimiter;
    const endingSlash = resource[resource.length - 1] === delimiter ? '' : delimiter;
    return `${rootSlash}${resource}${endingSlash}`;
  }
}
