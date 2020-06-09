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

export function isCatalogTemplate(o: any): o is CatalogTemplate {
  return (
    o &&
    typeof o === 'object' &&
    typeof o.id === 'string' &&
    typeof o.name === 'string' &&
    typeof o.description === 'string' &&
    (typeof o.icon === 'string' || o.icon === undefined) &&
    (typeof o.managerUrl === 'string' || o.managerUrl === undefined) &&
    (typeof o.documentationUrl === 'string' || o.documentationUrl === undefined) &&
    (o.tags === undefined || (Array.isArray(o.tags) && !o.tags.find((t: any) => typeof t !== 'string')))
  );
}

export function isCatalog(o: any): o is Catalog {
  let templateIds: any = {};
  return (
    o &&
    typeof o === 'object' &&
    Array.isArray(o.templates) &&
    !o.templates.find((t: any) => !isCatalogTemplate(t)) &&
    !o.templates.find((t: CatalogTemplate) => {
      // ensure no duplicate template IDs
      if (templateIds[t.id]) {
        return true;
      } else {
        templateIds[t.id] = true;
        return false;
      }
    })
  );
}

export function parseCatalog(data: any): Catalog {
  if (!data || typeof data !== 'object') {
    throw new Error('Template catalog must be a JSON object.');
  }
  if (!Array.isArray(data.templates)) {
    throw new Error(`Template catalog's 'templates' property must be an array.`);
  }
  let templateIds: any = {};
  data.templates.forEach((t: any) => {
    ['id', 'name', 'description'].forEach(p => {
      if (typeof t[p] !== 'string') {
        throw new Error(`The '${p}' property of a template must be a string.`);
      }
    });
    ['icon', 'managerUrl', 'documentationUrl'].forEach(p => {
      if (t[p] !== undefined && typeof t[p] !== 'string') {
        throw new Error(`The '${p}' property of a template, if specified, must be a string.`);
      }
    });
    if (templateIds[t.id]) {
      throw new Error(
        `The '${t.id}' template id is not unique. Template id must be unique within the entire template catalog.`
      );
    }
    templateIds[t.id] = true;
    if (t.tags && !Array.isArray(t.tags)) {
      throw new Error(`The 'tags' property of a template, if specified, must be an array of strings.`);
    }
    if (t.tags) {
      t.tags.forEach((e: any) => {
        if (typeof e !== 'string') {
          throw new Error(`The 'tags' property of a template must only contain strings.`);
        }
      });
    }
  });

  return data as Catalog;
}
