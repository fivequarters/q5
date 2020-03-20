export type CatalogTemplate = {
  id: string;
  name: string;
  description: string;
  tags?: string[];
  icon?: string;
  managerUrl: string;
  documentationUrl?: string;
};

export type Catalog = {
  templates: CatalogTemplate[];
};

export function parseCatalog(data: any): Catalog {
  if (!data || typeof data !== "object") {
    throw new Error("Template catalog must be a JSON object.");
  }
  if (!Array.isArray(data.templates)) {
    throw new Error(
      `Template catalog's 'templates' property must be an array.`
    );
  }
  let templateIds: any = {};
  data.templates.forEach((t: any) => {
    ["id", "name", "description"].forEach(p => {
      if (typeof t[p] !== "string") {
        throw new Error(`The '${p}' property of a template must be a string.`);
      }
    });
    ["icon", "managerUrl", "documentationUrl"].forEach(p => {
      if (t[p] !== undefined && typeof t[p] !== "string") {
        throw new Error(
          `The '${p}' property of a template, if specified, must be a string.`
        );
      }
    });
    if (templateIds[t.id]) {
      throw new Error(
        `The '${t.id}' template id is not unique. Template id must be unique within the entire template catalog.`
      );
    }
    templateIds[t.id] = true;
    if (t.tags && !Array.isArray(t.tags)) {
      throw new Error(
        `The 'tags' property of a template, if specified, must be an array of strings.`
      );
    }
    if (t.tags) {
      t.tags.forEach((e: any) => {
        if (typeof e !== "string") {
          throw new Error(
            `The 'tags' property of a template must only contain strings.`
          );
        }
      });
    }
  });

  return data as Catalog;
}
