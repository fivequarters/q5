import LinearProgress from "@material-ui/core/LinearProgress";
import Link from "@material-ui/core/Link";
import React from "react";
import { Link as RouterLink } from "react-router-dom";
import ExplorerTable, { HeadCell } from "./ExplorerTable";
import PortalError from "./PortalError";
import { useBoundaries } from "./BoundariesProvider";

interface ViewRow {
  id: string;
  functions: number;
  // firstExecuted: string;
  // lastExecuted: string;
  // errorsLast24h: string;
  // executionsLast24h: string;
}

function SubscriptionBoundaries() {
  const [boundaries] = useBoundaries();

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

  if (boundaries.status === "loading") {
    return <LinearProgress />;
  }

  if (boundaries.status === "error") {
    return <PortalError error={boundaries.error} padding={true} />;
  }

  const viewData = Object.keys(boundaries.existing).map(boundaryId =>
    createViewRow(boundaries.existing[boundaryId])
  );

  return (
    <ExplorerTable<ViewRow>
      rows={viewData}
      headCells={headCells}
      defaultSortKey="id"
      identityKey="id"
      title="Boundaries"
      size="narrow"
    />
  );
}

export default SubscriptionBoundaries;
