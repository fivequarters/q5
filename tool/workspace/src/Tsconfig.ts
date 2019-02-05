import JsonFile from './JsonFile';

function addWorkspaceReference(workspaceReferences: { path: string }[], path: string): { path: string }[] {
  const result = updateWorkspaceReference(workspaceReferences, path);
  result.push({ path });
  return result;
}

function updateWorkspaceReference(
  workspaceReferences: { path: string }[] = [],
  path: string,
  newPath?: string
): { path: string }[] {
  const result = [];
  const pathNormalized = path.toLowerCase();
  for (const workspaceReference of workspaceReferences) {
    const workspaceReferenceNormalized = workspaceReference.path.toLowerCase();
    if (workspaceReferenceNormalized !== pathNormalized) {
      result.push(workspaceReference);
    } else if (newPath) {
      result.push({ path: newPath });
    }
  }
  return result;
}

export default class Tsconfig extends JsonFile {
  constructor(path: string) {
    super(path);
  }

  public async UpdateExtendsPath(extendsPath: string) {
    await super.Load();
    this.contents.extends = extendsPath;
    await super.Save();
  }

  public async GetWorkspaceReferences(): Promise<string[]> {
    await super.Load();
    const references = this.contents.references || [];
    const workspaceReferences = [];
    for (const reference of references) {
      workspaceReferences.push(reference.path);
    }
    return workspaceReferences;
  }

  public async AddWorkspaceReference(referencePath: string) {
    await super.Load();
    this.contents.references = addWorkspaceReference(this.contents.references, referencePath);
    await super.Save();
  }

  public async RemoveWorkspaceReference(referencePath: string) {
    await super.Load();
    if (this.contents.references) {
      this.contents.references = updateWorkspaceReference(this.contents.references, referencePath);
      await super.Save();
    }
  }

  public async UpdateWorkspaceReference(currentReferencePath: string, newReferencePath: string) {
    await super.Load();
    if (this.contents.references) {
      this.contents.references = updateWorkspaceReference(
        this.contents.references,
        currentReferencePath,
        newReferencePath
      );
      await super.Save();
    }
  }
}
