import LinearProgress from "@material-ui/core/LinearProgress";
import Link from "@material-ui/core/Link";
import React from "react";
import { Link as RouterLink } from "react-router-dom";
import loadBoundaries from "../effects/LoadBoundaries";
import ExplorerTable, { HeadCell } from "./ExplorerTable";
import PortalError from "./PortalError";
import { useProfile } from "./ProfileProvider";

interface ViewRow {
  id: string;
  functions: number;
  // firstExecuted: string;
  // lastExecuted: string;
  // errorsLast24h: string;
  // executionsLast24h: string;
}

function SubscriptionBoundaries({ data, onNewData, match }: any) {
  const { profile } = useProfile();
  const { params } = match;
  const { subscriptionId } = params;

  const createViewRow = (dataRow: any): ViewRow => ({
    id: dataRow.boundaryId as string,
    functions: dataRow.functions.length
    // firstExecuted: "N/A",
    // lastExecuted: "N/A",
    // errorsLast24h: "N/A",
    // executionsLast24h: "N/A"
  });

  const headCells: HeadCell<ViewRow>[] = [
    {
      id: "id",
      // disablePadding: true,
      align: "left",
      label: "Boundary Name",
      render: row => (
        <Link component={RouterLink} to={`boundaries/${row.id}/functions`}>
          {row.id}
        </Link>
      )
    },
    {
      id: "functions",
      label: "Functions"
    }
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

  React.useEffect(
    loadBoundaries(profile, subscriptionId, undefined, data, onNewData),
    [data, onNewData, profile, subscriptionId]
  );

  if (!data || !data.boundaries || !data.boundaries[subscriptionId]) {
    return <LinearProgress />;
  }

  if (data.boundaries[subscriptionId].error) {
    return <PortalError error={data.boundaries[subscriptionId].error} />;
  }

  if (
    data.boundaries[subscriptionId].data &&
    !data.boundaries[subscriptionId].viewData
  ) {
    data.boundaries[subscriptionId].viewData = Object.keys(
      data.boundaries[subscriptionId].data
    ).map(boundaryId =>
      createViewRow(data.boundaries[subscriptionId].data[boundaryId])
    );
    onNewData && onNewData({ ...data });
  }

  return (
    <ExplorerTable<ViewRow>
      rows={data.boundaries[subscriptionId].viewData}
      headCells={headCells}
      defaultSortKey="id"
      identityKey="id"
      title="Boundaries"
      size="narrow"
    />
  );
}

export default SubscriptionBoundaries;
