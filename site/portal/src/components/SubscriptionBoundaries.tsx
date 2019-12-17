import React from "react";
import { useProfile } from "./ProfileProvider";
import LinearProgress from "@material-ui/core/LinearProgress";
import ExplorerTable, { HeadCell } from "./ExplorerTable";
import { getFunctions } from "../lib/Fusebit";
import { FusebitError } from "./ErrorBoundary";
import PortalError from "./PortalError";
import Link from "@material-ui/core/Link";
import { Link as RouterLink } from "react-router-dom";

interface ViewRow {
  id: string;
  functions: number;
  firstExecuted: string;
  lastExecuted: string;
  errorsLast24h: string;
  executionsLast24h: string;
}

function SubscriptionBoundaries({ data, onNewData, match }: any) {
  const { profile } = useProfile();
  const { params } = match;
  const { subscriptionId } = params;

  const createViewRow = (dataRow: any): ViewRow => ({
    id: dataRow.boundaryId as string,
    functions: dataRow.functions.length,
    firstExecuted: "N/A",
    lastExecuted: "N/A",
    errorsLast24h: "N/A",
    executionsLast24h: "N/A"
  });

  const headCells: HeadCell<ViewRow>[] = [
    {
      id: "id",
      // disablePadding: true,
      align: "left",
      label: "Boundary Name",
      render: row => (
        <Link component={RouterLink} to={`boundaries/${row.id}/overview`}>
          {row.id}
        </Link>
      )
    },
    {
      id: "functions",
      label: "Functions"
    },
    {
      id: "firstExecuted",
      label: "First Executed"
    },
    {
      id: "lastExecuted",
      label: "Last Executed"
    },
    {
      id: "errorsLast24h",
      label: "Errors (last 24h)"
    },
    {
      id: "executionsLast24h",
      label: "Executions (last 24h)"
    }
  ];

  React.useEffect(() => {
    let cancelled: boolean = false;
    if (!data || !data.boundaries || !data.boundaries[subscriptionId]) {
      (async () => {
        let boundaries: any = data.boundaries || {};
        try {
          let boundaryFunction: any = await getFunctions(
            profile,
            subscriptionId
          );
          // console.log("LOADED FUNCTION DATA", boundaryFunction);
          boundaries[subscriptionId] = {
            viewData: Object.keys(boundaryFunction).map(boundaryId =>
              createViewRow(boundaryFunction[boundaryId])
            )
          };
        } catch (e) {
          boundaries[subscriptionId] = {
            error: new FusebitError("Error loading boundary information", {
              details:
                (e.status || e.statusCode) === 403
                  ? "The Fusebit account or subscription does not exist or you are not authorized to access it's list of functions."
                  : e.message || "Unknown error."
            })
          };
        }
        !cancelled && onNewData && onNewData({ ...data, boundaries });
      })();
      return () => {
        cancelled = true;
      };
    }
  }, [data, onNewData, profile, subscriptionId]);

  if (!data || !data.boundaries || !data.boundaries[subscriptionId]) {
    return <LinearProgress />;
  }

  if (data.boundaries[subscriptionId].error) {
    return <PortalError error={data.boundaries[subscriptionId].error} />;
  }

  return (
    <ExplorerTable<ViewRow>
      rows={data.boundaries[subscriptionId].viewData}
      headCells={headCells}
      defaultSortKey="id"
      identityKey="id"
      title="Boundaries"
    />
  );
}

export default SubscriptionBoundaries;
