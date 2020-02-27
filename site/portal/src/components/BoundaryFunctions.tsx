import React from "react";
import LinearProgress from "@material-ui/core/LinearProgress";
import ExplorerTable, { HeadCell } from "./ExplorerTable";
import PortalError from "./PortalError";
import Link from "@material-ui/core/Link";
import { Link as RouterLink } from "react-router-dom";
import { useBoundaries } from "./BoundariesProvider";

interface ViewRow {
  id: string;
  // firstExecuted: string;
  // lastExecuted: string;
  // errorsLast24h: string;
  // executionsLast24h: string;
}

function BoundaryFunctions({ boundaryId }: any) {
  const [boundaries] = useBoundaries();

  const createViewRow = (dataRow: any): ViewRow => ({
    id: dataRow.functionId as string
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
      label: "Function Name",
      render: row => (
        <Link component={RouterLink} to={`functions/${row.id}/overview`}>
          {row.id}
        </Link>
      )
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

  const viewData = (
    (boundaries.existing[boundaryId] &&
      boundaries.existing[boundaryId].functions) ||
    []
  ).map(createViewRow);

  return (
    <ExplorerTable<ViewRow>
      rows={viewData}
      headCells={headCells}
      defaultSortKey="id"
      identityKey="id"
      title="Functions"
      size="narrow"
    />
  );
}

export default BoundaryFunctions;
