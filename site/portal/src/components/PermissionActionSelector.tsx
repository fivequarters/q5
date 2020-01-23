import MenuItem from "@material-ui/core/MenuItem";
import Select from "@material-ui/core/Select";
import React from "react";
import { useProfile } from "./ProfileProvider";

const actions = [
  { action: "function:*", description: "Full control of functions" },
  {
    action: "function:get",
    description: "List and get function definitions and build status"
  },
  { action: "function:put", description: "Create and update functions" },
  { action: "function:delete", description: "Delete functions" },
  {
    action: "function:get-log",
    description: "Get real-time logs of functions"
  }, // boundary or function scope
  { action: "account:get", description: "Get account details" },
  {
    action: "subscription:get",
    description: "List subscriptions and get subscription details"
  },
  { action: "audit:get", description: "Get audit logs" }, // account scope only
  { action: "user:*", description: "Full control of users" },
  {
    action: "user:add",
    description: "Create users, set initial permissions and identities"
  },
  {
    action: "user:init",
    description: "Generate initialization tokens for users"
  },
  {
    action: "user:get",
    description:
      "List users and get user details, including permissions and identities"
  },
  {
    action: "user:update",
    description: "Update user details, including permissions and identities"
  },
  { action: "user:delete", description: "Delete users" },
  { action: "client:*", description: "Full control of clients" },
  {
    action: "client:add",
    description: "Create clients, set initial permissions and identities"
  },
  {
    action: "client:init",
    description: "Generate initialization tokens for clients"
  },
  {
    action: "client:get",
    description:
      "List clients and get client details, including permissions and identities"
  },
  {
    action: "client:update",
    description: "Update client details, including permissions and identities"
  },
  { action: "client:delete", description: "Delete clients" },
  // { action: "account:*", description: "Full control of the account" }, // do we need?
  // { action: "global:add:account", description: "Create account" }, // no CLI or portal support
  // { action: "global:delete:account", description: "Delete account" }, // no CLI or portal support
  // { action: "account:update", description: "Update account details" }, // no API
  // { action: "subscription:*", description: "Full control of subscriptions" }, // do we need?
  // { action: "global:add:subscription", description: "Create subscription" }, // no CLI or portal support
  // { action: "global:delete:subscription", description: "Delete subscription" }, // no CLI or portal support
  // { action: "subscription:update", description: "Update subscription details" }, // no API
  { action: "issuer:*", description: "Full control of issuers" },
  { action: "issuer:add", description: "Create issuers" },
  { action: "issuer:get", description: "List issuers and get issuer details" },
  { action: "issuer:update", description: "Update issuers" },
  { action: "issuer:delete", description: "Delete issuers" }
  // omitted - storage permissions
];

function PermissionActionSelector({ action, onChange, ...rest }: any) {
  const { profile } = useProfile();
  const allow = (profile.me && profile.me.access.allow) || [];

  const isActionInScope = (candidate: string, existing: string) => {
    if (existing === "*" || candidate === existing) return true;
    let tokens = existing.split(":");
    if (tokens[1] === "*" && candidate.indexOf(`${tokens[0]}:`) === 0)
      return true;
    return false;
  };

  const allowedActions = actions.reduce<any[]>((current, a) => {
    for (let i = 0; i < allow.length; i++) {
      if (isActionInScope(a.action, allow[i].action)) {
        current.push(a);
        return current;
      }
    }
    return current;
  }, []);

  if (!action && onChange && allowedActions.length > 0) {
    action = allowedActions[0].action;
    onChange(action, allowedActions[0].description);
  }

  const handleActionChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    if (onChange) {
      let description = "";
      let action = event.target.value as string;
      for (var i = 0; i < actions.length; i++) {
        if (actions[i].action === action) {
          description = actions[i].description;
          break;
        }
      }
      onChange(action, description);
    }
  };

  return (
    <Select
      id="actionChoice"
      value={action}
      onChange={handleActionChange}
      {...rest}
    >
      {allowedActions.map((a: any) => (
        <MenuItem key={a.action} value={a.action}>
          <strong>{a.action}</strong> - {a.description}
        </MenuItem>
      ))}
    </Select>
  );
}

export default PermissionActionSelector;
