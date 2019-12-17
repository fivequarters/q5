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
  firstExecuted: string;
  lastExecuted: string;
  errorsLast24h: string;
  executionsLast24h: string;
}

function BoundaryFunctions({ data, onNewData, match }: any) {
  const { profile } = useProfile();
  const { params } = match;
  const { subscriptionId, boundaryId } = params;

  const createViewRow = (dataRow: any): ViewRow => ({
    id: dataRow.functionId as string,
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
      label: "Function Name",
      render: row => (
        <Link component={RouterLink} to={`functions/${row.id}/overview`}>
          {row.id}
        </Link>
      )
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
    if (
      !data ||
      !data.functions ||
      !data.functions[subscriptionId] ||
      !data.functions[subscriptionId][boundaryId]
    ) {
      (async () => {
        let functions: any = data.functions || {};
        functions[subscriptionId] = functions[subscriptionId] || {};
        functions[subscriptionId][boundaryId] =
          functions[subscriptionId][boundaryId] || {};
        try {
          let boundaryFunction: any = await getFunctions(
            profile,
            subscriptionId,
            boundaryId
          );
          // console.log("LOADED FUNCTION DATA", boundaryFunction);
          functions[subscriptionId][boundaryId] = {
            viewData: boundaryFunction[boundaryId].functions.map(createViewRow)
          };
        } catch (e) {
          functions[subscriptionId][boundaryId] = {
            error: new FusebitError("Error loading function information", {
              details:
                (e.status || e.statusCode) === 403
                  ? "The Fusebit account, subscription, or boundary does not exist or you are not authorized to access it's list of functions."
                  : e.message || "Unknown error."
            })
          };
        }
        !cancelled && onNewData && onNewData({ ...data, functions });
      })();
      return () => {
        cancelled = true;
      };
    }
  }, [data, onNewData, profile, subscriptionId, boundaryId]);

  if (
    !data ||
    !data.functions ||
    !data.functions[subscriptionId] ||
    !data.functions[subscriptionId][boundaryId]
  ) {
    return <LinearProgress />;
  }

  if (data.functions[subscriptionId][boundaryId].error) {
    return (
      <PortalError error={data.functions[subscriptionId][boundaryId].error} />
    );
  }

  return (
    <ExplorerTable<ViewRow>
      rows={data.functions[subscriptionId][boundaryId].viewData}
      headCells={headCells}
      defaultSortKey="id"
      identityKey="id"
      title="Functions"
    />
  );
}

export default BoundaryFunctions;
