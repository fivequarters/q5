import React from "react";
import { useProfile } from "./ProfileProvider";
import LinearProgress from "@material-ui/core/LinearProgress";
import ExplorerTable, { HeadCell } from "./ExplorerTable";
import { getUsers, deleteUsers } from "../lib/Fusebit";
import { FusebitError } from "./ErrorBoundary";
import PortalError from "./PortalError";
import UserAvatar from "./UserAvatar";
import Link from "@material-ui/core/Link";
import { Link as RouterLink } from "react-router-dom";
import DialogContentText from "@material-ui/core/DialogContentText";
import Typography from "@material-ui/core/Typography";
import ActionButton from "./ActionButton";

interface ViewRow {
  name: string;
  email: string;
  id: string;
  identities: number;
  permissions: number;
}

function AccountUsers({ data, onNewData }: any) {
  const { profile } = useProfile();
  // const { params } = match;

  const createViewRow = (dataRow: any): ViewRow => ({
    name: `${[dataRow.firstName, dataRow.lastName].join(" ").trim() || "N/A"}${
      profile.me && profile.me.id === dataRow.id ? " (you)" : ""
    }`,
    email: dataRow.primaryEmail || "N/A",
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
        <Link component={RouterLink} to={`users/${row.id}/overview`}>
          <UserAvatar letter={row.name[0]} />
          {row.name}
        </Link>
      )
    },
    {
      id: "email",
      align: "left",
      label: "Email"
    },
    {
      id: "id",
      align: "left",
      label: "User ID"
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
    if (!data || !data.users) {
      (async () => {
        let users: any;
        try {
          let dataRows = await getUsers(profile);
          // console.log("LOADED USER DATA", dataRows);
          users = { viewData: dataRows.map(createViewRow) };
        } catch (e) {
          users = {
            error: new FusebitError("Error loading user information", {
              details:
                (e.status || e.statusCode) === 403
                  ? "The Fusebit account does not exist or you are not authorized to access it's list of users."
                  : e.message || "Unknown error."
            })
          };
        }
        !cancelled && onNewData && onNewData({ ...data, users });
      })();
      return () => {
        cancelled = true;
      };
    }
  }, [data, onNewData, profile]);

  if (!data || !data.users) {
    return <LinearProgress />;
  }

  if (data.users.error) {
    return <PortalError error={data.users.error} />;
  }

  const handleDelete = async (selected: string[]) => {
    let viewData: ViewRow[] = [];
    data.users.viewData.forEach((row: ViewRow) => {
      if (selected.indexOf(row.id) === -1) {
        viewData.push(row);
      }
    });
    let newUsers: any = { viewData };
    try {
      await deleteUsers(profile, selected);
    } catch (e) {
      newUsers = {
        error: new FusebitError("Error deleting users", {
          details:
            (e.status || e.statusCode) === 403
              ? "You are not authorized to delete users in this account."
              : e.message || "Unknown error.",
          actions: [
            {
              text: "Back to users",
              func: () => onNewData && onNewData({ ...data, users: undefined })
            }
          ]
        })
      };
    }
    onNewData && onNewData({ ...data, users: newUsers });
  };

  const generateDeleteContent = (selected: string[]) => {
    return (
      <div>
        <DialogContentText>
          {selected.length > 1
            ? `You are about to delete ${selected.length} users.`
            : `You are about to delete the selected user.`}
        </DialogContentText>
        {selected.indexOf((profile.me && profile.me.id) || "") > -1 &&
          selected.length > 1 && (
            <React.Fragment>
              <Typography color="primary">WARNING</Typography>
              <DialogContentText>
                One of the users you are about to delete is you. If you
                continue, you may loose access to the portal.
              </DialogContentText>
            </React.Fragment>
          )}
        {selected.indexOf((profile.me && profile.me.id) || "") > -1 &&
          selected.length === 1 && (
            <React.Fragment>
              <Typography color="primary">WARNING</Typography>
              <DialogContentText>
                The user you are about to delete is you. If you continue, you
                may loose access to the portal.
              </DialogContentText>
            </React.Fragment>
          )}
      </div>
    );
  };

  return (
    <ExplorerTable<ViewRow>
      rows={data.users.viewData}
      headCells={headCells}
      defaultSortKey="name"
      identityKey="id"
      title="Users"
      enableSelection={true}
      onDelete={handleDelete}
      deleteTitle={selected =>
        selected.length > 1 ? "Delete users?" : "Delete user?"
      }
      deleteContent={generateDeleteContent}
      actions={<ActionButton href="users/new">New&nbsp;user</ActionButton>}
    />
  );
}

export default AccountUsers;
