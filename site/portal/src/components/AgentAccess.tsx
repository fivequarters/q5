import DialogContentText from "@material-ui/core/DialogContentText";
import LinearProgress from "@material-ui/core/LinearProgress";
import Typography from "@material-ui/core/Typography";
import React from "react";
import { Permission } from "../lib/FusebitTypes";
import ActionButton from "./ActionButton";
import AddPermissionDialog from "./AddPermissionDialog";
import { modifyAgent, reloadAgent, saveAgent, useAgent } from "./AgentProvider";
import EditPermissionsAsJsonDialog from "./EditPermissionsAsJsonDialog";
import ExplorerTable, { HeadCell } from "./ExplorerTable";
import { useProfile } from "./ProfileProvider";
import AddPermissionSetDialog from "./AddPermissionSetDialog";
import { tryTokenizeResource } from "../lib/Actions";
import FunctionResourceCrumb from "./FunctionResourceCrumb";

interface ViewRow {
  action: string;
  resource: string;
  id: string;
}

const createPermissionId = (permission: any) =>
  `${permission.action}#${permission.resource}`;

const createViewRow = (dataRow: any): ViewRow => ({
  action: dataRow.action,
  resource: dataRow.resource,
  id: createPermissionId(dataRow)
});

const createAccessView = (access: any) =>
  ((access && access.allow) || []).map(createViewRow);

function AgentAccess() {
  const [agent, setAgent] = useAgent();
  const { profile } = useProfile();
  const [
    editPermissionsDialogOpen,
    setEditPermissionsDialogOpen
  ] = React.useState(false);
  const [addPermissionDialogOpen, setAddPermissionDialogOpen] = React.useState(
    false
  );
  const [addPermissionSetOpen, setAddPermissionSetOpen] = React.useState(false);

  const headCells: HeadCell<ViewRow>[] = [
    {
      id: "action",
      disablePadding: true,
      align: "left",
      label: "Action"
    },
    {
      id: "resource",
      align: "left",
      label: "Resource",
      render: row => {
        const resource = tryTokenizeResource(row.action, row.resource);
        return resource ? (
          <FunctionResourceCrumb options={resource} />
        ) : (
          <span>{row.resource}</span>
        );
      }
    }
  ];

  const handleSaveJsonPermissions = () => {
    setEditPermissionsDialogOpen(false);
    if (agent.status === "error") {
      reloadAgent(agent, setAgent);
    }
  };

  const handleAddPermission = () => {
    setAddPermissionDialogOpen(false);
    if (agent.status === "error") {
      reloadAgent(agent, setAgent);
    }
  };

  const handleAddPermissionSetClose = () => {
    setAddPermissionSetOpen(false);
    if (agent.status === "error") {
      reloadAgent(agent, setAgent);
    }
  };

  const handleDelete = async (selected: string[]) => {
    if (selected && selected.length > 0 && agent.status === "ready") {
      let allow: Permission[] = [];
      ((agent.modified.access && agent.modified.access.allow) || []).forEach(
        p => {
          if (selected.indexOf(createPermissionId(p)) === -1) {
            allow.push(p);
          }
        }
      );
      agent.modified.access = { allow };
      modifyAgent(agent, setAgent, { ...agent.modified });
      saveAgent(agent, setAgent);
    }
  };

  const generateDeleteContent = (selected: string[]) => {
    return (
      <div>
        <DialogContentText>
          {selected.length > 1
            ? `You are about to delete ${selected.length} permissions.`
            : `You are about to delete the selected permission.`}
        </DialogContentText>
        {agent.agentId === (profile.me && profile.me.id) && (
          <React.Fragment>
            <Typography color="primary">WARNING</Typography>
            <DialogContentText>
              You are deleting permissions for the currently logged in user. If
              you continue, you may loose access to the portal.
            </DialogContentText>
          </React.Fragment>
        )}
      </div>
    );
  };

  if (agent.status === "loading") {
    return <LinearProgress />;
  } else if (
    agent.status === "ready" ||
    agent.status === "updating" ||
    agent.status === "error"
  ) {
    return (
      <React.Fragment>
        {(agent.status === "ready" || agent.status === "updating") && (
          <ExplorerTable<ViewRow>
            rows={createAccessView(agent.modified.access)}
            headCells={headCells}
            defaultSortKey="action"
            identityKey="id"
            title="Permissions"
            noDataBody={
              <Typography>
                The {agent.isUser ? "user" : "client"} has no permissions in the
                system.
              </Typography>
            }
            actions={
              <React.Fragment>
                <ActionButton
                  disabled={agent.status !== "ready"}
                  onClick={() => setAddPermissionDialogOpen(true)}
                >
                  Add&nbsp;permission
                </ActionButton>
                <ActionButton
                  disabled={agent.status !== "ready"}
                  onClick={() => setAddPermissionSetOpen(true)}
                >
                  Add&nbsp;permission&nbsp;set
                </ActionButton>
                <ActionButton
                  disabled={agent.status !== "ready"}
                  onClick={() => setEditPermissionsDialogOpen(true)}
                >
                  Edit&nbsp;as&nbsp;JSON
                </ActionButton>
              </React.Fragment>
            }
            enableSelection={true}
            onDelete={handleDelete}
            deleteTitle={selected =>
              selected.length > 1 ? "Delete permissions?" : "Delete permission?"
            }
            deleteContent={generateDeleteContent}
            disablePagination={true}
          />
        )}
        {editPermissionsDialogOpen && (
          <EditPermissionsAsJsonDialog onClose={handleSaveJsonPermissions} />
        )}
        {addPermissionDialogOpen && (
          <AddPermissionDialog onClose={handleAddPermission} />
        )}
        {addPermissionSetOpen && (
          <AddPermissionSetDialog onClose={handleAddPermissionSetClose} />
        )}
      </React.Fragment>
    );
  }
  return null;
}

export default AgentAccess;
