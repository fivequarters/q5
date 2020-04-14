import LinearProgress from "@material-ui/core/LinearProgress";
import Typography from "@material-ui/core/Typography";
import Grid from "@material-ui/core/Grid";
import React from "react";
import { Audit, AuditFilter } from "../lib/FusebitTypes";
import { AuditProvider, useAudit, updateAuditFilter } from "./AuditProvider";
import ExplorerTable, { HeadCell } from "./ExplorerTable";
import PortalError from "./PortalError";
import ActivityFilterContent, {
  defaultFilterFrom,
  defaultFilterAction,
} from "./ActivityFilterContent";
import Radio from "@material-ui/core/Radio";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import { makeStyles } from "@material-ui/core/styles";
import { getUISettings, setUISettings } from "../lib/Settings";
import WarningCard from "./WarningCard";

const useStyles = makeStyles((theme: any) => ({
  showTimeAs: {
    marginLeft: theme.spacing(10),
  },
  noWrap: {
    whiteSpace: "nowrap",
  },
  warning: {
    marginLeft: theme.spacing(2),
    marginRight: theme.spacing(2),
  },
}));

const pad = (i: number) => (i < 10 ? "0" + i : i.toString());

type ActivityProps = {
  filter: AuditFilter;
  actionFilter?: string[];
};

function ActivityImpl({ actionFilter, filter }: ActivityProps) {
  const [audit, setAudit] = useAudit();
  const [utc, setUtc] = React.useState<boolean>(getUISettings().utcTime);
  const classes = useStyles();

  const handleUtcChange = () => {
    setUISettings({ ...getUISettings(), utcTime: !utc });
    setUtc(!utc);
  };

  const headCells: HeadCell<Audit>[] = [
    {
      id: "resource",
      align: "left",
      label: "Resource",
      // render: row => (
      //   <Link component={RouterLink} to={`users/${row.id}/properties`}>
      //     <UserAvatar letter={row.name[0]} />
      //     {row.name}
      //   </Link>
      // )
    },
    {
      id: "action",
      align: "left",
      label: "Action",
      render: (row) => (
        <Typography variant="inherit" className={classes.noWrap}>
          {row.action}
        </Typography>
      ),
    },
    {
      id: "timestamp",
      align: "left",
      label: utc ? "Time (UTC)" : "Time (Local)",
      render: (row) => {
        const d = new Date(row.timestamp);
        return utc ? (
          <Typography variant="inherit" className={classes.noWrap}>
            {d.getUTCFullYear()}-{pad(d.getUTCMonth() + 1)}-
            {pad(d.getUTCDate())}&nbsp;{pad(d.getUTCHours())}:
            {pad(d.getUTCMinutes())}:{pad(d.getUTCSeconds())}
          </Typography>
        ) : (
          <Typography variant="inherit" className={classes.noWrap}>
            {d.getFullYear()}-{pad(d.getMonth() + 1)}-{pad(d.getDate())}&nbsp;
            {pad(d.getHours())}:{pad(d.getMinutes())}:{pad(d.getSeconds())}
          </Typography>
        );
      },
    },
    {
      id: "issuerId",
      align: "left",
      label: "Issuer ID",
      // render: (row) => (
      //   <Typography variant="inherit" className={classes.noWrap}>
      //     {row.issuerId}
      //   </Typography>
      // ),
    },
    {
      id: "subject",
      align: "left",
      label: "Subject",
      // render: (row) => (
      //   <Typography variant="inherit" className={classes.noWrap}>
      //     {row.subject}
      //   </Typography>
      // ),
    },
  ];

  if (audit.status === "loading" || audit.status === "updating") {
    return <LinearProgress />;
  }

  if (audit.status === "error") {
    return <PortalError error={audit.error} padding={true} />;
  }

  const updateFilter = (newFilter: AuditFilter) => {
    updateAuditFilter(audit, setAudit, newFilter);
  };

  const handleFilterReset = () => {
    updateFilter(filter);
  };

  const handleFilterApply = (newFilter: AuditFilter) => {
    updateFilter(newFilter);
  };

  // return <pre>{JSON.stringify(audit.data, null, 2)}</pre>;
  return (
    <React.Fragment>
      {audit.data.hasMore && (
        <div className={classes.warning}>
          <WarningCard>
            Showing only the first {audit.data.data.length} matching audit
            entries. Please use the filter to narrow down the criteria.
          </WarningCard>
        </div>
      )}
      <ExplorerTable<Audit>
        rows={audit.data.data}
        headCells={headCells}
        defaultSortKey="timestamp"
        defaultSortOrder="desc"
        identityKey="id"
        title="Activity"
        enableSelection={false}
        filterContent={
          <ActivityFilterContent
            filter={audit.filter}
            actionFilter={actionFilter}
            utc={utc}
            onReset={handleFilterReset}
            onApply={handleFilterApply}
          />
        }
        actions={
          <Typography
            component="div"
            variant="body2"
            className={classes.showTimeAs}
          >
            <Grid component="label" container alignItems="center" spacing={2}>
              <Grid item>Show time as:</Grid>
              <Grid item>
                <FormControlLabel
                  value="utc"
                  control={
                    <Radio
                      color="secondary"
                      checked={utc}
                      size="small"
                      onChange={handleUtcChange}
                    />
                  }
                  label={<Typography variant="body2">UTC</Typography>}
                />
              </Grid>
              <Grid item>
                <FormControlLabel
                  value="local"
                  control={
                    <Radio
                      color="secondary"
                      checked={!utc}
                      size="small"
                      onChange={handleUtcChange}
                    />
                  }
                  label={<Typography variant="body2">Local</Typography>}
                />
              </Grid>
            </Grid>
          </Typography>
        }
      />
    </React.Fragment>
  );
}

function Activity({ filter, actionFilter }: ActivityProps) {
  if (!filter.from && !filter.to) {
    filter.from = defaultFilterFrom;
  }
  if (!filter.action) {
    filter.action = defaultFilterAction;
  }
  return (
    <AuditProvider filter={filter}>
      <ActivityImpl filter={filter} actionFilter={actionFilter} />
    </AuditProvider>
  );
}

export default Activity;
