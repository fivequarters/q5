import MenuItem from "@material-ui/core/MenuItem";
import Select from "@material-ui/core/Select";
import React from "react";
import { noRole, roles, rolesHash } from "../lib/Actions";

function PermissionRoleSelector({
  role,
  onRoleChange,
  allowNoRole,
  ...rest
}: any) {
  const handleRoleChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    let roleName = event.target.value as string;
    onRoleChange &&
      onRoleChange(roleName === noRole.role ? noRole : rolesHash[roleName]);
  };

  return (
    <Select
      id="roleChoice"
      value={role.role}
      fullWidth
      variant="filled"
      onChange={handleRoleChange}
      {...rest}
    >
      {allowNoRole && (
        <MenuItem key={noRole.role} value={noRole.role}>
          <strong>{noRole.title}</strong> - {noRole.description}
        </MenuItem>
      )}
      {roles.map((a: any) => (
        <MenuItem key={a.role} value={a.role}>
          <strong>{a.title}</strong> - {a.description}
        </MenuItem>
      ))}
    </Select>
  );
}

export default PermissionRoleSelector;
