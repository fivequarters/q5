const Constants = require('@5qtrs/constants');

export const TAG_SEP = '/';
export const TAG_CATEGORY_FUNCTION = 'function-tags-function';

export const keyValueTableName = Constants.get_key_value_table_name(process.env.DEPLOYMENT_KEY);

export const get_compute_tag_key = (key) => `compute.${key}`;
export const get_dependency_tag_key = (key) => `dependency.${key}`;
export const get_versions_tag_key = (key) => `environment.${key}`;
export const get_metadata_tag_key = (key) => `tag.${key}`;
export const get_template_tag_key = (key) => `template.${key}`;

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

  // Collect tags from the compute structure
  if (spec.compute) {
    const computeTags = ['memorySize', 'timeout', 'staticIp', 'runtime'];
    for (const t of computeTags) {
      if (t in spec.compute) {
        tags[get_compute_tag_key(t)] = spec.compute[t];
      }
    }
  }

  // Collect tags from the dependencies
  if (spec.internal && spec.internal.dependencies && spec.internal.resolved_dependencies) {
    for (const t in spec.internal.dependencies) {
      tags[get_dependency_tag_key(t)] = spec.internal.resolved_dependencies[t];
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

  // Collect the enable/disable flag
  if ('enable' in spec) {
    tags[get_compute_tag_key('enable')] = spec.enable;
  } else {
    tags[get_compute_tag_key('enable')] = true;
  }

  // Create a tag for cron
  if (spec.schedule && spec.schedule.cron) {
    tags.cron = true;
    tags['cron.schedule'] = JSON.stringify(spec.schedule);
  } else {
    tags.cron = false;
  }

  return tags;
}
