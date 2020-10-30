import { IFusebitProfile } from './Settings';
import { Permission, Resource } from './FusebitTypes';

const actions = [
  {
    action: 'function:*',
    description: 'Full control of functions',
  },
  {
    action: 'function:get',
    description: 'List and get function definitions and build status',
  },
  { action: 'function:put', description: 'Create and update functions' },
  { action: 'function:delete', description: 'Delete functions' },
  {
    action: 'function:get-log',
    description: 'Get real-time logs of functions',
  }, // boundary or function scope
  { action: 'account:get', description: 'Get account details' },
  {
    action: 'subscription:get',
    description: 'List subscriptions and get subscription details',
  },
  { action: 'audit:get', description: 'Get audit logs' }, // account scope only
  { action: 'user:*', description: 'Full control of users' },
  {
    action: 'user:add',
    description: 'Create users, set initial permissions and identities',
  },
  {
    action: 'user:init',
    description: 'Generate initialization tokens for users',
  },
  {
    action: 'user:get',
    description: 'List users and get user details, including permissions and identities',
  },
  {
    action: 'user:update',
    description: 'Update user details, including permissions and identities',
  },
  { action: 'user:delete', description: 'Delete users' },
  { action: 'client:*', description: 'Full control of clients' },
  {
    action: 'client:add',
    description: 'Create clients, set initial permissions and identities',
  },
  {
    action: 'client:init',
    description: 'Generate initialization tokens for clients',
  },
  {
    action: 'client:get',
    description: 'List clients and get client details, including permissions and identities',
  },
  {
    action: 'client:update',
    description: 'Update client details, including permissions and identities',
  },
  { action: 'client:delete', description: 'Delete clients' },
  // { action: "account:*", description: "Full control of the account" }, // do we need?
  // { action: "global:add:account", description: "Create account" }, // no CLI or portal support
  // { action: "global:delete:account", description: "Delete account" }, // no CLI or portal support
  // { action: "account:update", description: "Update account details" }, // no API
  // { action: "subscription:*", description: "Full control of subscriptions" }, // do we need?
  // { action: "global:add:subscription", description: "Create subscription" }, // no CLI or portal support
  // { action: "global:delete:subscription", description: "Delete subscription" }, // no CLI or portal support
  // { action: "subscription:update", description: "Update subscription details" }, // no API
  { action: 'issuer:*', description: 'Full control of issuers' },
  { action: 'issuer:add', description: 'Create issuers' },
  { action: 'issuer:get', description: 'List issuers and get issuer details' },
  { action: 'issuer:update', description: 'Update issuers' },
  { action: 'issuer:delete', description: 'Delete issuers' },
  // omitted - storage permissions
  { action: 'registry:*', description: 'Full control of the npm registry' },
  { action: 'registry:get', description: 'Get packages from the npm registry' },
  { action: 'registry-config:put', description: 'Configure the supported scopes in the registry' },
  { action: 'registry:put', description: 'Put or delete packages in the npm registry' },
];

const actionsHash = actions.reduce<any>((current, value) => {
  current[value.action] = value;
  return current;
}, {});

const noRole = {
  role: 'none',
  title: 'No permissions',
  description: 'No permissions in the system',
  actions: [],
};

const sameRole = {
  role: 'same',
  title: 'Same',
  description: 'The same permissions I have',
  actions: [],
};

const roles = [
  {
    role: 'developer',
    title: 'Function developer',
    description: 'Full control of functions, list/get details of subscriptions and the account',
    actions: ['function:*', 'subscription:get', 'account:get'],
  },
  {
    role: 'admin',
    title: 'Account admin',
    description: 'Full control of the account',
    actions: ['function:*', 'subscription:get', 'account:get', 'issuer:*', 'user:*', 'client:*', 'audit:get'],
  },
];

const rolesHash = roles.reduce<any>((current, value) => {
  current[value.role] = value;
  return current;
}, {});

const makeResource = (profile: IFusebitProfile, action: string, options: any) => {
  let resource = [`/account/${profile.account}/`];
  if (action.indexOf('function:') === 0) {
    if (options.subscriptionId.trim() && options.subscriptionId.trim() !== '*') {
      resource.push(`subscription/${options.subscriptionId.trim()}/`);
      if (options.boundaryId.trim()) {
        resource.push(`boundary/${options.boundaryId.trim()}/`);
        if (options.functionId.trim()) {
          resource.push(`function/${options.functionId.trim()}/`);
        }
      }
    }
  }
  return resource.join('');
};

function createPermissionsFromRole(profile: IFusebitProfile, role: any, resource: any): Permission[] {
  if (role.role === sameRole.role) {
    return (profile.me && (profile.me.access.allow as Permission[])) || [];
  }
  let allow: Permission[] = [];
  rolesHash[role.role].actions.forEach((a: string) => {
    const permission = {
      action: a,
      resource: makeResource(profile, a, resource),
    };
    allow.push(permission);
  });
  return allow;
}

function tryTokenizeResource(resource: string): Resource | undefined {
  let match = resource.match(
    /^\/(?:account\/([^/]+)\/(?:subscription\/([^/]+)\/(?:boundary\/([^/]+)\/(?:function\/([^/]+)\/(?:([^/]+)\/)?)?)?)?)?$/
  );
  if (match) {
    const [, accountId, subscriptionId, boundaryId, functionId, functionComponent] = match;
    return {
      ...{
        accountId,
        subscriptionId,
        boundaryId,
        functionId,
        functionComponent,
      },
    };
  }
  match = resource.match(/^\/account\/([^/]+)\/subscription\/([^/]+)\/boundary\/([^/]+)\/function\/$/);
  if (match) {
    const [, accountId, subscriptionId, boundaryId] = match;
    return {
      ...{
        accountId,
        subscriptionId,
        boundaryId,
      },
    };
  }
  match = resource.match(/^\/account\/([^/]+)\/subscription\/([^/]+)\/([^/]+)\/$/);
  if (match) {
    const [, accountId, subscriptionId, subscriptionComponent] = match;
    return {
      ...{
        accountId,
        subscriptionId,
        subscriptionComponent,
      },
    };
  }
  match = resource.match(/^\/(?:account\/([^/]+)\/(?:issuer\/([^/]+)\/)?)?$/);
  if (match) {
    const [, accountId, issuerId] = match;
    return {
      ...{
        accountId,
        issuerId: (issuerId && decodeURIComponent(issuerId)) || undefined,
      },
    };
  }
  match = resource.match(/^\/(?:account\/([^/]+)\/(?:user\/([^/]+)\/)?)?$/);
  if (match) {
    const [, accountId, userId] = match;
    return { ...{ accountId, userId } };
  }
  match = resource.match(/^\/(?:account\/([^/]+)\/(?:client\/([^/]+)\/)?)?$/);
  if (match) {
    const [, accountId, clientId] = match;
    return { ...{ accountId, clientId } };
  }
  match = resource.match(/^\/account\/([^/]+)\/([^/]+)\/$/);
  if (match) {
    const [, accountId, accountComponent] = match;
    return { ...{ accountId, accountComponent } };
  }
  return undefined;
}

export { actions, actionsHash, roles, rolesHash, noRole, sameRole, createPermissionsFromRole, tryTokenizeResource };
