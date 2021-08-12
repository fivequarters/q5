export enum Permissions {
  allPermissions = '*',

  addAccount = 'global:add:account',
  getAccount = 'account:get',
  updateAccount = 'account:update',
  deleteAccount = 'global:delete:account',

  addSubscription = 'global:add:subscription',
  getSubscription = 'subscription:get',
  updateSubscription = 'subscription:update',
  deleteSubscription = 'global:delete:subscription',

  allIssuer = 'issuer:*',
  addIssuer = 'issuer:add',
  getIssuer = 'issuer:get',
  updateIssuer = 'issuer:update',
  deleteIssuer = 'issuer:delete',

  allUser = 'user:*',
  addUser = 'user:add',
  getUser = 'user:get',
  updateUser = 'user:update',
  deleteUser = 'user:delete',
  initUser = 'user:init',

  allClient = 'client:*',
  addClient = 'client:add',
  getClient = 'client:get',
  updateClient = 'client:update',
  deleteClient = 'client:delete',
  initClient = 'client:init',

  getAudit = 'audit:get',

  allStorage = 'storage:*',
  getStorage = 'storage:get',
  putStorage = 'storage:put',
  deleteStorage = 'storage:delete',

  allFunction = 'function:*',
  putFunction = 'function:put',
  getFunction = 'function:get',
  logFunction = 'function:post-logs',
  exeFunction = 'function:execute',

  allRegistry = 'registry:*',
  configRegistry = 'registry-config:put',
  getRegistry = 'registry:get',
  putRegistry = 'registry:put',
}

const makePermissionSet = (prefix: string) => ({
  [prefix]: {
    get: `${prefix}:get`,
    put: `${prefix}:put`,
    delete: `${prefix}:delete`,
    putTag: `${prefix}:put-tag`,
    all: `${prefix}:*`,
  },
});

export const v2Permissions: Record<any, any> = {
  ...makePermissionSet('integration'),
  ...makePermissionSet('instance'),
  ...makePermissionSet('connector'),
  ...makePermissionSet('identity'),
  putOperation: 'operation:put',
  postSession: 'session:post',
  putSession: 'session:put',
  getSession: 'session:get',
  commitSession: 'session:commit',
};

// Deployment Administrator Permissions
export const RestrictedPermissions: string[] = [
  Permissions.allPermissions,

  Permissions.addAccount,
  Permissions.updateAccount,
  Permissions.deleteAccount,

  Permissions.addSubscription,
  Permissions.updateSubscription,
  Permissions.deleteSubscription,

  Permissions.logFunction,
];

export const UserPermissions: string[] = Object.values(Permissions).filter(
  (e) => RestrictedPermissions.indexOf(e) === -1
);

export const isSpecialized = (permission: Permissions, query: string): boolean => {
  const leader = query.split(':')[0];
  return permission.indexOf(leader) === 0;
};
