import React from "react";
import { useProfile } from "./ProfileProvider";
import LinearProgress from "@material-ui/core/LinearProgress";
import ExplorerTable, { HeadCell } from "./ExplorerTable";
import { getClients, deleteClients } from "../lib/Fusebit";
import { FusebitError } from "./ErrorBoundary";
import PortalError from "./PortalError";
import Link from "@material-ui/core/Link";
import { Link as RouterLink } from "react-router-dom";
import DialogContentText from "@material-ui/core/DialogContentText";

interface ViewRow {
  name: string;
  id: string;
  identities: number;
  permissions: number;
}

function AccountClients({ data, onNewData }: any) {
  const { profile } = useProfile();
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
        <Link component={RouterLink} to={`clients/${row.id}/overview`}>
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

  React.useEffect(() => {
    let cancelled: boolean = false;
    if (!data || !data.clients) {
      (async () => {
        let clients: any;
        try {
          let dataRows = await getClients(profile);
          // console.log("LOADED USER DATA", dataRows);
          clients = { viewData: dataRows.map(createViewRow) };
        } catch (e) {
          clients = {
            error: new FusebitError("Error loading client information", {
              details:
                (e.status || e.statusCode) === 403
                  ? "The Fusebit account does not exist or you are not authorized to access it's list of clients."
                  : e.message || "Unknown error."
            })
          };
        }
        !cancelled && onNewData && onNewData({ ...data, clients });
      })();
      return () => {
        cancelled = true;
      };
    }
  }, [data, onNewData, profile]);

  if (!data || !data.clients) {
    return <LinearProgress />;
  }

  if (data.clients.error) {
    return <PortalError error={data.clients.error} />;
  }

  const handleDelete = async (selected: string[]) => {
    let viewData: ViewRow[] = [];
    data.clients.viewData.forEach((row: ViewRow) => {
      if (selected.indexOf(row.id) === -1) {
        viewData.push(row);
      }
    });
    let newClients: any = { viewData };
    try {
      await deleteClients(profile, selected);
    } catch (e) {
      newClients = {
        error: new FusebitError("Error deleting clients", {
          details:
            (e.status || e.statusCode) === 403
              ? "You are not authorized to delete clients in this account."
              : e.message || "Unknown error.",
          actions: [
            {
              text: "Back to clients",
              func: () =>
                onNewData && onNewData({ ...data, clients: undefined })
            }
          ]
        })
      };
    }
    onNewData && onNewData({ ...data, clients: newClients });
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

  return (
    <ExplorerTable<ViewRow>
      rows={data.clients.viewData}
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
    />
  );
}

export default AccountClients;
