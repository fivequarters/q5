const Constants = require('@5qtrs/constants');

const mustache = require('mustache');

const {
  get_compute_tag_key,
  get_dependency_tag_key,
  get_versions_tag_key,
  get_metadata_tag_key,
  get_template_tag_key,
  get_fusebit_tag_key,
  get_security_tag_key,
  get_routes_tag_key,
} = Constants;

export const TAG_SEP = '/';
export const TAG_CATEGORY_FUNCTION = 'function-tags-function';

export const keyValueTableName = Constants.get_key_value_table_name(process.env.DEPLOYMENT_KEY);

export const encode = (v) => encodeURIComponent(v);

export function get_func_sort_key(options) {
  return [options.accountId, options.subscriptionId, options.boundaryId, options.functionId].join(TAG_SEP);
}

export function get_func_search_key(options) {
  if (options.boundaryId) {
    return [options.accountId, options.subscriptionId, options.boundaryId].join(TAG_SEP);
  } else {
    return [options.accountId, options.subscriptionId].join(TAG_SEP);
  }
}

// Convert a function specification into a set of key:value pairs in tags.
export function convert_spec_to_tags(spec) {
  const tags = {};

  // Collect function location tags
  const fusebitTags = ['accountId', 'subscriptionId', 'boundaryId', 'functionId'];
  for (const t of fusebitTags) {
    tags[get_fusebit_tag_key(t)] = spec[t];
  }

  // Collect tags from the compute structure
  if (spec.compute) {
    const computeTags = ['memorySize', 'timeout', 'staticIp', 'runtime', 'persistLogs'];
    for (const t of computeTags) {
      if (t in spec.compute) {
        tags[get_compute_tag_key(t)] = spec.compute[t];
      }
    }
  }

  // Collect tags from the dependencies
  if (spec.internal && spec.internal.dependencies && spec.internal.resolved_dependencies) {
    for (const t in spec.internal.dependencies) {
      if (typeof spec.internal.resolved_dependencies[t] === 'object') {
        tags[get_dependency_tag_key(`version.${t}`)] = spec.internal.resolved_dependencies[t].version;
        tags[get_dependency_tag_key(`registry.${t}`)] = spec.internal.resolved_dependencies[t].registry;
      } else {
        tags[get_dependency_tag_key(`version.${t}`)] = spec.internal.resolved_dependencies[t];
        tags[get_dependency_tag_key(`registry.${t}`)] = Constants.MODULE_PUBLIC_REGISTRY;
      }
      tags[get_dependency_tag_key(`semver.${t}`)] = spec.internal.dependencies[t];
    }
  }

  // Collect tags from internal versions
  if (spec.internal && spec.internal.versions) {
    for (const t in spec.internal.versions) {
      tags[get_versions_tag_key(t)] = spec.internal.versions[t];
    }
  }

  // Collect tags from parent template specification
  if (spec.metadata && spec.metadata.template) {
    tags[get_template_tag_key('id')] = spec.metadata.template.id;
    tags[get_template_tag_key('version')] = spec.metadata.template.version;
    tags[get_template_tag_key('managerurl')] = spec.metadata.template.managerUrl;
  }

  // Collect tags from the customer-specified tags
  if (spec.metadata && spec.metadata.tags) {
    for (const t in spec.metadata.tags) {
      tags[get_metadata_tag_key(t)] = spec.metadata.tags[t];
    }
  }

  // Create a tag for cron
  if (spec.schedule && spec.schedule.cron) {
    tags.cron = true;
    tags['cron.schedule'] = JSON.stringify(spec.schedule);
  } else {
    tags.cron = false;
  }

  const structuredTags = structurize(tags);
  // Special case a few tags to be easier to get.
  for (const t of fusebitTags) {
    structuredTags[t] = spec[t];
  }

  if (spec.security) {
    // Collect the authentication
    tags[get_security_tag_key('authentication')] = spec.security.authentication || 'none';

    // Collect the permissions
    if (spec.security.functionPermissions) {
      tags[get_security_tag_key('permissions')] = JSON.stringify({
        allow: mPerms(spec.security.functionPermissions.allow, structuredTags),
      });
    }

    // Collect the authorization
    if (spec.security.authorization) {
      tags[get_security_tag_key('authorization')] = JSON.stringify(mPerms(spec.security.authorization, structuredTags));
    }
  } else {
    tags[get_security_tag_key('authentication')] = 'none';
  }

  if (spec.routes) {
    const routesWithCompiledPermissions = [];
    spec.routes.forEach((route) => {
      const compiledRoute = {
        ...route,
        security: !route.security
          ? undefined
          : {
              ...route.security,
              authorization: route.security.authorization
                ? mPerms(route.security.authorization, structuredTags)
                : undefined,
              functionPermissions: route.security.functionPermissions
                ? { allow: mPerms(route.security.functionPermissions.allow, structuredTags) }
                : undefined,
            },
      };
      // Add task implementation parameters to the route
      if (compiledRoute.task) {
        const taskQueue = spec.internal && spec.internal.taskQueues && spec.internal.taskQueues[route.path];
        if (taskQueue) {
          compiledRoute.task = { ...compiledRoute.task, queue: taskQueue };
        }
      }
      routesWithCompiledPermissions.push(compiledRoute);
    });
    tags[get_routes_tag_key()] = JSON.stringify(routesWithCompiledPermissions);
  }

  return tags;
}

// Convert 'compute.foo.bar' or 'tag.foo.bar' into { compute: { foo: { bar: value } } }
const structurize = (tags) => {
  const result = {};
  for (const [tag, value] of Object.entries(tags)) {
    const keys = tag.split('.');
    let w = result;
    let lastW = w;
    let lastK;
    for (let k of keys) {
      w[k] = w[k] || {};

      // Cron conflicts with itself, alas, so create a 'cron_' object to use instead.
      while (typeof w[k] !== 'object') {
        k = k + '_';
        w[k] = w[k] || {};
      }

      lastW = w;
      lastK = k;
      w = w[k];
    }

    lastW[lastK] = value;
  }

  return result;
};

// Convert permission objects, if mustache syntax is used.
const mPerms = (perms, view) => {
  let result = [];
  for (const perm of perms) {
    result.push({ action: perm.action, resource: mustache.render(perm.resource, view) });
  }

  return result;
};
