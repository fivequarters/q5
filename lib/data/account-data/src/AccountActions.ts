// -------------------
// Exported Interfaces
// -------------------

export enum AccountActions {
  addAccount = 'global:add:account',
  getAccount = 'account:get',
  updateAccount = 'account:update',
  deleteAccount = 'global:delete:account',

  addSubscription = 'global:add:subscription',
  getSubscription = 'subscription:get',
  updateSubscription = 'subscription:update',
  deleteSubscription = 'global:delete:subscription',

  addIssuer = 'issuer:add',
  getIssuer = 'issuer:get',
  updateIssuer = 'issuer:update',
  deleteIssuer = 'issuer:delete',

  addUser = 'user:add',
  getUser = 'user:get',
  updateUser = 'user:update',
  deleteUser = 'user:delete',
  initUser = 'user:init',

  addClient = 'client:add',
  getClient = 'client:get',
  updateClient = 'client:update',
  deleteClient = 'client:delete',
  initClient = 'client:init',

  getAudit = 'audit:get',

  getLogs = 'log:get',
}
