import React from "react";
import { useProfile } from "./ProfileProvider";
import LinearProgress from "@material-ui/core/LinearProgress";
import ExplorerTable, { HeadCell } from "./ExplorerTable";
import PortalError from "./PortalError";
import Link from "@material-ui/core/Link";
import { Link as RouterLink } from "react-router-dom";
import loadSubscriptions from "../effects/LoadSubscriptions";

interface ViewRow {
  name: string;
  id: string;
  // functions: string;
  // firstExecuted: string;
  // lastExecuted: string;
  // errorsLast24h: string;
  // executionsLast24h: string;
}

function AccountSubscriptions({ data, onNewData }: any) {
  const { profile } = useProfile();
  // const { params } = match;

  const createViewRow = (dataRow: any): ViewRow => ({
    name: dataRow.displayName || "N/A",
    id: dataRow.id as string
    // functions: "N/A",
    // firstExecuted: "N/A",
    // lastExecuted: "N/A",
    // errorsLast24h: "N/A",
    // executionsLast24h: "N/A"
  });

  const headCells: HeadCell<ViewRow>[] = [
    {
      id: "name",
      // disablePadding: true,
      align: "left",
      label: "Subscription Name",
      render: row => (
        <Link component={RouterLink} to={`subscriptions/${row.id}/boundaries`}>
          {row.name}
        </Link>
      )
    },
    {
      id: "id",
      align: "left",
      label: "Subscription ID"
    }
    // {
    //   id: "functions",
    //   label: "Functions"
    // },
    // {
    //   id: "firstExecuted",
    //   label: "First Executed"
    // },
    // {
    //   id: "lastExecuted",
    //   label: "Last Executed"
    // },
    // {
    //   id: "errorsLast24h",
    //   label: "Errors (last 24h)"
    // },
    // {
    //   id: "executionsLast24h",
    //   label: "Executions (last 24h)"
    // }
  ];

  React.useEffect(loadSubscriptions(profile, data, onNewData), [
    data,
    onNewData,
    profile
  ]);

  if (!data || !data.subscriptions) {
    return <LinearProgress />;
  }

  if (data.subscriptions.error) {
    return <PortalError error={data.subscriptions.error} padding={true} />;
  }

  if (!data.subscriptions.viewData) {
    data.subscriptions.viewData = data.subscriptions.data.map(createViewRow);
    onNewData && onNewData({ ...data });
  }

  return (
    <ExplorerTable<ViewRow>
      rows={data.subscriptions.viewData}
      headCells={headCells}
      defaultSortKey="name"
      identityKey="id"
      title="Subscriptions"
      size="narrow"
    />
  );
}

export default AccountSubscriptions;
