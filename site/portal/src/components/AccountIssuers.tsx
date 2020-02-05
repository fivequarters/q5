import React from "react";
import { useProfile } from "./ProfileProvider";
import { makeStyles } from "@material-ui/core/styles";
import LinearProgress from "@material-ui/core/LinearProgress";
import ExplorerTable, { HeadCell } from "./ExplorerTable";
import { getIssuers, deleteIssuers } from "../lib/Fusebit";
import { FusebitError } from "./ErrorBoundary";
import PortalError from "./PortalError";
import IssuerAvatar from "./IssuerAvatar";
import Link from "@material-ui/core/Link";
import { Link as RouterLink } from "react-router-dom";
import DialogContentText from "@material-ui/core/DialogContentText";
import Typography from "@material-ui/core/Typography";

interface ViewRow {
  name: string;
  id: string;
  keyAcquisition: "Stored Public Key" | "JWKS Endpoint";
  // firstUsed: string;
  // lastUsed: string;
}

const useStyles = makeStyles(theme => ({
  link: {
    display: "inline-flex",
    alignItems: "center"
  }
}));

function AccountIssuers({ data, onNewData }: any) {
  const { profile } = useProfile();
  const classes = useStyles();
  // const { params } = match;

  const createViewRow = (dataRow: any): ViewRow => ({
    name: dataRow.displayName || "N/A",
    id: dataRow.id as string,
    keyAcquisition: dataRow.jsonKeysUrl ? "JWKS Endpoint" : "Stored Public Key"
    // firstUsed: "N/A",
    // lastUsed: "N/A"
  });

  const headCells: HeadCell<ViewRow>[] = [
    {
      id: "name",
      disablePadding: true,
      align: "left",
      label: "Name",
      render: row => (
        <Link
          component={RouterLink}
          to={`issuers/${encodeURIComponent(row.id)}/properties`}
          className={classes.link}
        >
          <IssuerAvatar id={row.id} />
          {row.name}
        </Link>
      )
    },
    {
      id: "keyAcquisition",
      align: "left",
      label: "Public Key Acquisition"
    },
    {
      id: "id",
      align: "left",
      label: "Issuer ID"
    }
    // {
    //   id: "firstUsed",
    //   label: "First Used",
    //   align: "left"
    // },
    // {
    //   id: "lastUsed",
    //   label: "Last Used",
    //   align: "left"
    // }
  ];

  React.useEffect(() => {
    let cancelled: boolean = false;
    if (!data || !data.issuers) {
      (async () => {
        let issuers: any;
        try {
          let dataRows = await getIssuers(profile);
          // console.log("LOADED USER DATA", dataRows);
          issuers = { viewData: dataRows.map(createViewRow) };
        } catch (e) {
          issuers = {
            error: new FusebitError("Error loading issuer information", {
              details:
                (e.status || e.statusCode) === 403
                  ? "The Fusebit account does not exist or you are not authorized to access it's list of issuers."
                  : e.message || "Unknown error."
            })
          };
        }
        !cancelled && onNewData && onNewData({ ...data, issuers });
      })();
      return () => {
        cancelled = true;
      };
    }
  }, [data, onNewData, profile]);

  if (!data || !data.issuers) {
    return <LinearProgress />;
  }

  if (data.issuers.error) {
    return <PortalError error={data.issuers.error} />;
  }

  const handleDelete = async (selected: string[]) => {
    let viewData: ViewRow[] = [];
    data.issuers.viewData.forEach((row: ViewRow) => {
      if (selected.indexOf(row.id) === -1) {
        viewData.push(row);
      }
    });
    let newIssuers: any = { viewData };
    try {
      await deleteIssuers(profile, selected);
    } catch (e) {
      newIssuers = {
        error: new FusebitError("Error deleting issuers", {
          details:
            (e.status || e.statusCode) === 403
              ? "You are not authorized to delete issuers in this account."
              : e.message || "Unknown error.",
          actions: [
            {
              text: "Back to issuers",
              func: () =>
                onNewData && onNewData({ ...data, issuers: undefined })
            }
          ]
        })
      };
    }
    onNewData && onNewData({ ...data, issuers: newIssuers });
  };

  const generateDeleteContent = (selected: string[]) => {
    const deletingCurrentUsersIssuer =
      (profile.me &&
        profile.me.identities.reduce(
          (match: boolean, identity: { issuerId: string; subject: string }) =>
            match || selected.indexOf(identity.issuerId) > -1,
          false
        )) ||
      false;
    return (
      <div>
        <DialogContentText>
          {selected.length > 1
            ? `You are about to delete ${selected.length} issuers.`
            : `You are about to delete the selected issuer.`}
        </DialogContentText>
        {deletingCurrentUsersIssuer && selected.length > 1 && (
          <React.Fragment>
            <Typography color="primary">WARNING</Typography>
            <DialogContentText>
              One of the issuers you are about to delete enables you to log in.
              If you continue, you may loose access to the portal.
            </DialogContentText>
          </React.Fragment>
        )}
        {deletingCurrentUsersIssuer && selected.length === 1 && (
          <React.Fragment>
            <Typography color="primary">WARNING</Typography>
            <DialogContentText>
              The issuer you are about to delete enables you to log in. If you
              continue, you may loose access to the portal.
            </DialogContentText>
          </React.Fragment>
        )}
      </div>
    );
  };

  return (
    <ExplorerTable<ViewRow>
      rows={data.issuers.viewData}
      headCells={headCells}
      defaultSortKey="name"
      identityKey="id"
      title="Issuers"
      enableSelection={true}
      onDelete={handleDelete}
      deleteTitle={selected =>
        selected.length > 1 ? "Delete issuers?" : "Delete issuer?"
      }
      deleteContent={generateDeleteContent}
    />
  );
}

export default AccountIssuers;
