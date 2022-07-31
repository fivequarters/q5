import { EntityType } from '@fusebit/schema';

/*
 * Convention notes:
 *  - create an entity → add
 *  - update an entity → update
 *  - upsert and entitity → put
 *  - get/list → get
 *  - delete → delete
 */

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

  getLogs = 'log:get',
  scheduleFunction = 'function:schedule',
}

interface IPermissionSet {
  get: string;
  add: string;
  update: string;
  delete: string;
  putTag: string;
  execute: string;
  all: string;
}

const makePermissionSet = (prefix: string): IPermissionSet => ({
  get: `${prefix}:get`,
  add: `${prefix}:add`,
  update: `${prefix}:update`,
  delete: `${prefix}:delete`,
  putTag: `${prefix}:put-tag`,
  execute: `${prefix}:execute`,
  all: `${prefix}:*`,
});

const makeInvalidPermissionSet = (): IPermissionSet => makePermissionSet('invalid');

export interface IV2Permissions {
  integration: IPermissionSet;
  install: IPermissionSet;
  connector: IPermissionSet;
  identity: IPermissionSet;
  storage: IPermissionSet;
  session: IPermissionSet;
  addSession: string;
  updateSession: string;
  getSession: string;
  commitSession: string;
}

export const v2Permissions: IV2Permissions = {
  integration: makePermissionSet('integration'),
  install: makePermissionSet('install'),
  connector: makePermissionSet('connector'),
  identity: makePermissionSet('identity'),

  // Include storage and session primarily to keep other parts of the system from yelling when a generic
  // EntityType is used.  Currently the storage permissions are exposed via v1, and session has it's own
  // explicit set. below.
  storage: makeInvalidPermissionSet(),
  session: makeInvalidPermissionSet(),

  addSession: 'session:add',
  updateSession: 'session:update',
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
