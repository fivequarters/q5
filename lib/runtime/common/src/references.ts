import { ISpanEvent } from './grafana';

const getReferences = (fullUrl: string): Record<string, string[]> => {
  const url = new URL(fullUrl);
  const result: Record<string, string[]> = {
    connector: [],
    integration: [],
    storage: [],
    identity: [],
    install: [],
    session: [],
  };

  if (!url.hostname.endsWith('fusebit.io') && !url.hostname.endsWith('fivequarters.io')) {
    return result;
  }

  // Test to see if it's a v2 resource
  const accountParams = url.pathname.match(
    '^/(?<apiVersion>v1|v2)/account/(?<accountId>acc-[a-f0-9]{16})/subscription/(?<subscriptionId>sub-[a-f0-9]{16})(?<subPath>.*)'
  );
  if (!accountParams || !accountParams.groups) {
    // Maybe it was cdn.fusebit.io or some other non-function-api endpoint, or something that accessed the
    // root account or subscription objects. Or a v1 function invocation, which isn't supported yet.
    return result;
  }

  const entityType = accountParams.groups.subPath.match('^/(?<entityType>connector|integration|storage)(?<subPath>.*)');

  if (!entityType || !entityType.groups) {
    return result;
  }

  if (entityType.groups.entityType === 'storage') {
    result.storage.push(entityType.groups.subPath);
    return result;
  }

  const entityId = entityType.groups.subPath.match('^/(?<entityId>[^/]+)(?<subPath>.*)');
  if (!entityId || !entityId.groups) {
    // A request for all of a particular entity type, no attributes to add
    return result;
  }

  // Record the parent entity
  result[entityType.groups.entityType].push(entityId.groups.entityId);

  const subEntityType = entityId.groups.subPath.match(
    '^/(?<subEntityType>install|identity|session)/(?<subEntityId>sid-[a-f0-9]{32}|idn-[a-f0-9]{32}|ins-[a-f0-9]{32})[/]?'
  );

  if (subEntityType && subEntityType.groups) {
    result[subEntityType.groups.subEntityType].push(subEntityType.groups.subEntityId);
    return result;
  }

  // Is it an /api call on a connector, which has a contract?
  if (entityId.groups.subPath.startsWith('/api') && entityType.groups.entityType === 'connector') {
    const rIdnKey = '(?<lookupKey>idn-[a-f0-9]{32})';
    const rSidKey = '(?<lookupKey>sid-[a-f0-9]{32})';
    const path = entityId.groups.subPath;

    // Is it a /api/:lookupKey/health?
    let check = path.match(`^/api/${rIdnKey}/(health|token)$`);
    if (check && check.groups) {
      result.identity.push(check.groups.lookupKey);
      return result;
    }

    check = path.match(`^/api/session/${rSidKey}/token$`);
    if (check && check.groups) {
      result.session.push(check.groups.lookupKey);
      return result;
    }
  }

  return result;
};

const convertUrlToReferences = (url: string, previousReferences: Record<string, string> = {}): Record<string, string> =>
  // Flatten the results, merging with any previous results.
  Object.entries(getReferences(url)).reduce<Record<string, string>>((prev, [key, values]) => {
    prev[key] = [...new Set(prev[key] ? [...prev[key].split(','), ...values] : values)].join(',');
    return prev;
  }, previousReferences);

export { convertUrlToReferences };
