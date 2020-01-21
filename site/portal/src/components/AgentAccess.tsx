import Button from "@material-ui/core/Button";
import DialogContentText from "@material-ui/core/DialogContentText";
import LinearProgress from "@material-ui/core/LinearProgress";
import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import React from "react";
import { FusebitError } from "./ErrorBoundary";
import ExplorerTable, { HeadCell } from "./ExplorerTable";
import PortalError from "./PortalError";
import { useProfile } from "./ProfileProvider";
import EditPermissionsAsJsonDialog from "./EditPermissionsAsJsonDialog";
import AddPermissionDialog from "./AddPermissionDialog";

interface ViewRow {
  action: string;
  resource: string;
  id: string;
}

const useStyles = makeStyles((theme: any) => ({
  actionButton: {
    marginLeft: theme.spacing(5)
  }
}));

const createPermissionId = (permission: any) =>
  `${permission.action}#${permission.resource}`;

const createViewRow = (dataRow: any): ViewRow => ({
  action: dataRow.action,
  resource: dataRow.resource,
  id: createPermissionId(dataRow)
});

const createAccessView = (access: any) =>
  ((access && access.allow) || []).map(createViewRow);

function AgentAccess({
  match,
  getAgent,
  updateAgent,
  normalizeAgent,
  isUser
}: any) {
  const classes = useStyles();
  const { profile } = useProfile();
  const { params } = match;
  const { clientId, userId } = params;
  const agentId = (isUser ? userId : clientId) as string;
  const [agent, setAgent] = React.useState<any>(undefined);
  const [data, setData] = React.useState<any>(undefined);
  const [
    editPermissionsDialogOpen,
    setEditPermissionsDialogOpen
  ] = React.useState(false);
  const [addPermissionDialogOpen, setAddPermissionDialogOpen] = React.useState(
    false
  );

  const headCells: HeadCell<ViewRow>[] = [
    {
      id: "action",
      disablePadding: true,
      align: "left",
      label: "Action"
      // render: row => (
      //   <Link component={RouterLink} to={`users/${row.id}/overview`}>
      //     <UserAvatar letter={row.name[0]} />
      //     {row.name}
      //   </Link>
      // )
    },
    {
      id: "resource",
      align: "left",
      label: "Resource"
    }
  ];

  React.useEffect(() => {
    let cancelled: boolean = false;
    if (agent === undefined) {
      (async () => {
        let data: any;
        try {
          data = await getAgent(profile, agentId);
          data.accessView = createAccessView(data.access);
        } catch (e) {
          data = {
            error: new FusebitError("Error loading permissions", {
              details:
                (e.status || e.statusCode) === 403
                  ? "You are not authorized to access the permission information."
                  : e.message || "Unknown error."
            })
          };
        }
        !cancelled && setAgent(data);
      })();
      return () => {
        cancelled = true;
      };
    }
  }, [agent, profile, agentId, getAgent]);

  if (!agent) {
    return <LinearProgress />;
  }

  if (agent.error) {
    return <PortalError error={agent.error} />;
  }

  const handleNewData = (data: any) => setData(data);

  const handleAddPermission = async (permission: any) => {
    setAddPermissionDialogOpen(false);
    if (permission) {
      let allow = (agent.access && agent.access.allow) || [];
      for (var i = 0; i < allow.length; i++) {
        if (
          allow[i].action === permission.action &&
          allow[i].resource === permission.resource
        ) {
          return;
        }
      }
      allow.push(permission);
      agent.access = { allow };
      agent.accessView = createAccessView(agent.access);
      let newAgent = await saveAgent(agent);
      setAgent({ ...newAgent });
    }
  };

  const handleSaveJsonPermissions = async (allow: any) => {
    setEditPermissionsDialogOpen(false);
    if (allow) {
      agent.access = { allow };
      agent.accessView = createAccessView(agent.access);
      let newAgent = await saveAgent(agent);
      setAgent({ ...newAgent });
    }
  };

  const saveAgent = async (agent: any) => {
    try {
      await updateAgent(profile, agent);
    } catch (e) {
      agent = {
        error: new FusebitError("Error saving permission changes", {
          details:
            (e.status || e.statusCode) === 403
              ? "You are not authorized to make permission changes."
              : e.message || "Unknown error.",
          actions: [
            {
              text: "Back to permissions",
              func: () => setAgent(undefined)
            }
          ]
        })
      };
    }
    return agent;
  };

  const handleDelete = async (selected: string[]) => {
    let newAgent = { ...agent, accessView: [], access: { allow: [] } };
    agent.accessView.forEach((row: ViewRow) => {
      if (selected.indexOf(row.id) === -1) {
        newAgent.accessView.push(row);
      }
    });
    ((agent.access && agent.access.allow) || []).forEach((p: any) => {
      if (selected.indexOf(createPermissionId(p)) === -1) {
        newAgent.access.allow.push(p);
      }
    });
    newAgent = await saveAgent(newAgent);
    setAgent({ ...newAgent });
  };

  const generateDeleteContent = (selected: string[]) => {
    return (
      <div>
        <DialogContentText>
          {selected.length > 1
            ? `You are about to delete ${selected.length} permissions.`
            : `You are about to delete the selected permission.`}
        </DialogContentText>
        {agentId === (profile.me && profile.me.id) && (
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

  return (
    <React.Fragment>
      <ExplorerTable<ViewRow>
        rows={agent.accessView}
        headCells={headCells}
        defaultSortKey="action"
        identityKey="id"
        title="Permissions"
        noDataBody={
          <Typography>
            The {isUser ? "user" : "client"} has no permissions in the system.
          </Typography>
        }
        actions={
          <React.Fragment>
            <Button
              variant="outlined"
              color="primary"
              className={classes.actionButton}
              onClick={() => setAddPermissionDialogOpen(true)}
            >
              Add&nbsp;permission
            </Button>
            <Button
              variant="outlined"
              color="primary"
              className={classes.actionButton}
              onClick={() => setEditPermissionsDialogOpen(true)}
            >
              Edit&nbsp;as&nbsp;JSON
            </Button>
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
      {editPermissionsDialogOpen && (
        <EditPermissionsAsJsonDialog
          onClose={handleSaveJsonPermissions}
          agent={agent}
        />
      )}
      {addPermissionDialogOpen && (
        <AddPermissionDialog
          onClose={handleAddPermission}
          data={data}
          onNewData={handleNewData}
        />
      )}
    </React.Fragment>
  );
}

export default AgentAccess;
