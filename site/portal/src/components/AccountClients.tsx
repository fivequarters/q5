import React from "react";
import { useProfile } from "./ProfileProvider";
import LinearProgress from "@material-ui/core/LinearProgress";
import ExplorerTable, { HeadCell } from "./ExplorerTable";
import { deleteClients } from "../lib/Fusebit";
import { Client } from "../lib/FusebitTypes";
import { FusebitError } from "./ErrorBoundary";
import PortalError from "./PortalError";
import Link from "@material-ui/core/Link";
import { Link as RouterLink } from "react-router-dom";
import DialogContentText from "@material-ui/core/DialogContentText";
import ActionButton from "./ActionButton";
import { useAgents, removeAgents, reloadAgents } from "./AgentsProvider";

interface ViewRow {
  name: string;
  id: string;
  identities: number;
  permissions: number;
}

function AccountClients() {
  const { profile } = useProfile();
  const [agents, setAgents] = useAgents();
  // const { params } = match;

  const createViewRow = (dataRow: any): ViewRow => ({
    name: dataRow.displayName || "N/A",
    id: dataRow.id as string,
    identities: (dataRow.identities && dataRow.identities.length) || 0,
    permissions:
      (dataRow.access && dataRow.access.allow && dataRow.access.allow.length) ||
      0
  });

  const headCells: HeadCell<ViewRow>[] = [
    {
      id: "name",
      disablePadding: true,
      align: "left",
      label: "Name",
      render: row => (
        <Link component={RouterLink} to={`clients/${row.id}/properties`}>
          {row.name}
        </Link>
      )
    },
    {
      id: "id",
      align: "left",
      label: "Client ID"
    },
    {
      id: "identities",
      label: "Identities"
    },
    {
      id: "permissions",
      label: "Permissions"
    }
  ];

  if (agents.status === "loading") {
    return <LinearProgress />;
  }

  if (agents.status === "error") {
    return <PortalError error={agents.error} padding={true} />;
  }

  const handleDelete = async (selected: string[]) => {
    try {
      await deleteClients(profile, selected);
    } catch (e) {
      setAgents({
        status: "error",
        agentType: agents.agentType,
        error: new FusebitError("Error deleting clients", {
          details:
            (e.status || e.statusCode) === 403
              ? "You are not authorized to delete clients in this account."
              : e.message || "Unknown error.",
          actions: [
            {
              text: "Back to clients",
              func: () => reloadAgents(agents, setAgents)
            }
          ]
        })
      });
      return;
    }
    removeAgents(agents, setAgents, selected);
  };

  const generateDeleteContent = (selected: string[]) => {
    return (
      <div>
        <DialogContentText>
          {selected.length > 1
            ? `You are about to delete ${selected.length} clients. They will no longer be able to access Fusebit.`
            : `You are about to delete the selected client. It will no longer be able to access Fusebit.`}
        </DialogContentText>
      </div>
    );
  };

  const viewData = (agents.existing as Client[]).map(createViewRow);

  return (
    <ExplorerTable<ViewRow>
      rows={viewData}
      headCells={headCells}
      defaultSortKey="name"
      identityKey="id"
      title="Clients"
      enableSelection={true}
      onDelete={handleDelete}
      deleteTitle={selected =>
        selected.length > 1
          ? `Delete ${selected.length} clients?`
          : "Delete the client?"
      }
      deleteContent={generateDeleteContent}
      actions={<ActionButton href="clients/new">New&nbsp;client</ActionButton>}
    />
  );
}

export default AccountClients;
