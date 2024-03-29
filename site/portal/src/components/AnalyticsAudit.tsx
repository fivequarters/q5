import ProgressView from './ProgressView';
import { makeStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import React from 'react';
import { Audit, AuditFilter } from '../lib/FusebitTypes';
import { getUISettings, setUISettings } from '../lib/Settings';
import ActivityFilterContent, { defaultFilterAction, defaultFilterFrom } from './ActivityFilterContent';
import { AuditProvider, useAudit } from './AuditProvider';
import ExplorerTable, { HeadCell } from './ExplorerTable';
import PortalError from './PortalError';
import ResourceCrumb from './ResourceCrumb';
import TableInfoRow from './TableInfoRow';
import Chip from '@material-ui/core/Chip';
import AgentTooltip, { IssuerSubjectAgent } from './AgentTooltip';
import { AgentState } from './AgentProvider';
import CancelIcon from '@material-ui/icons/Cancel';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import { useHashHistory } from './HashHistory';

const useStyles = makeStyles((theme: any) => ({
  noWrap: {
    whiteSpace: 'nowrap',
  },
  warning: {
    marginLeft: theme.spacing(2),
    marginRight: theme.spacing(2),
  },
  chips: {
    display: 'flex',
    flexWrap: 'wrap',
  },
  chip: {
    marginRight: theme.spacing(1),
    marginBottom: theme.spacing(1),
  },
  access: {
    display: 'flex',
  },
}));

const pad = (i: number) => (i < 10 ? '0' + i : i.toString());

type AnalyticsAuditImplProps = {
  filterMask: AuditFilter;
  actionFilter?: string[];
};

function AnalyticsAuditImpl({ actionFilter, filterMask }: AnalyticsAuditImplProps) {
  const [audit] = useAudit();
  const [utc, setUtc] = React.useState<boolean>(getUISettings().utcTime);
  const classes = useStyles();
  const [, setHistory] = useHashHistory('audit', {});
  const [agents, setAgents] = React.useState<IssuerSubjectAgent>({});

  const formatUtcDate = (d: Date) =>
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(
      d.getUTCMinutes()
    )}:${pad(d.getUTCSeconds())}`;

  const formatLocalDate = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(
      d.getSeconds()
    )}`;

  const handleSetAgent = (issuerId: string, subject: string, agent: AgentState) => {
    if (!agents[issuerId]) {
      agents[issuerId] = {};
    }
    agents[issuerId][subject] = agent;
    setAgents({ ...agents });
  };

  const headCells: HeadCell<Audit>[] = [
    {
      id: 'authorized',
      align: 'left',
      label: 'Access',
      render: (row) =>
        row.authorized ? (
          <CheckCircleIcon className={classes.access} />
        ) : (
          <CancelIcon color="primary" className={classes.access} />
        ),
    },
    {
      id: 'resource',
      align: 'left',
      label: 'Resource',
      render: (row) => <ResourceCrumb resource={row.resource} resourceMask={filterMask.resource} />,
    },
    {
      id: 'action',
      align: 'left',
      label: 'Action',
      render: (row) => (
        <Typography variant="inherit" className={classes.noWrap}>
          {row.action}
        </Typography>
      ),
    },
    {
      id: 'timestamp',
      align: 'left',
      label: utc ? 'Time (UTC)' : 'Time (Local)',
      render: (row) => {
        const d = new Date(row.timestamp);
        return utc ? (
          <Typography variant="inherit" className={classes.noWrap}>
            {formatUtcDate(d)}
          </Typography>
        ) : (
          <Typography variant="inherit" className={classes.noWrap}>
            {formatLocalDate(d)}
          </Typography>
        );
      },
    },
    {
      id: 'issuerId',
      align: 'left',
      label: 'Issuer ID',
    },
    {
      id: 'subject',
      align: 'left',
      label: 'Subject',
      render: (row) => (
        <AgentTooltip issuerId={row.issuerId} subject={row.subject} agents={agents} onSetAgent={handleSetAgent}>
          <Typography variant="inherit">{row.subject}</Typography>
        </AgentTooltip>
      ),
    },
  ];

  if (audit.status === 'loading' || audit.status === 'updating') {
    return <ProgressView />;
  }

  if (audit.status === 'error') {
    return <PortalError error={audit.error} padding={true} />;
  }

  const updateFilter = (newFilter: AuditFilter) => {
    setHistory(newFilter);
  };

  const handleFilterReset = () => {
    setHistory({});
  };

  const handleFilterApply = (newFilter: AuditFilter, newUtc: boolean) => {
    updateFilter(newFilter);
    if (utc !== newUtc) {
      setUISettings({ ...getUISettings(), utcTime: newUtc });
      setUtc(newUtc);
    }
  };

  const handleDeleteResourceFilter = () => {
    updateFilter({ ...audit.filter, resource: filterMask.resource });
  };

  const handleDeleteActionFilter = () => {
    updateFilter({ ...audit.filter, action: filterMask.action });
  };

  const handleDeleteIssuerFilter = () => {
    updateFilter({ ...audit.filter, issuerId: filterMask.issuerId });
  };

  const handleDeleteSubjectFilter = () => {
    updateFilter({ ...audit.filter, subject: filterMask.subject });
  };

  function firstRowMessage() {
    if (audit.status === 'ready') {
      if (audit.data.data.length === 0) {
        return (
          <Typography variant="inherit">
            No matching audit entries found. Please use the filter to relax the search criteria.
          </Typography>
        );
      }

      if (audit.data.hasMore) {
        return (
          <TableInfoRow>
            Showing only the first {audit.data.data.length} matching audit entries. Please use the filter to narrow down
            the criteria.
          </TableInfoRow>
        );
      }
    }

    return undefined;
  }

  function FilterChips() {
    let chips: JSX.Element[] = [];

    const fromDescription: { [key: string]: string } = {
      '-15m': '15 minutes ago',
      '-30m': '30 minutes ago',
      '-1h': '1 hour ago',
      '-24h': '24 hours ago',
      '-7d': '7 days ago',
      '-30d': '30 days ago',
    };

    if (audit.filter.from) {
      let description: string | undefined = fromDescription[audit.filter.from];
      if (!description) {
        let d = new Date(audit.filter.from);
        description = (d && (utc ? formatUtcDate(d) + ' (UTC)' : formatLocalDate(d) + ' (Local)')) || audit.filter.from;
      }
      chips.push(<Chip className={classes.chip} key="from" label={`From: ${description}`} />);
      if (audit.filter.to) {
        let d = new Date(audit.filter.to);
        chips.push(
          <Chip
            className={classes.chip}
            key="to"
            label={`To: ${utc ? formatUtcDate(d) : formatLocalDate(d)} ${utc ? '(UTC)' : '(Local)'}`}
          />
        );
      }
    }

    if (audit.filter.resource && audit.filter.resource !== filterMask.resource) {
      chips.push(
        <Chip
          className={classes.chip}
          key="resource"
          label={`Resource prefix: ${
            filterMask.resource && audit.filter.resource.indexOf(filterMask.resource) === 0
              ? audit.filter.resource.substring(filterMask.resource.length)
              : audit.filter.resource
          }`}
          onDelete={handleDeleteResourceFilter}
        />
      );
    }

    if (audit.filter.action && audit.filter.action !== '*') {
      chips.push(
        <Chip
          className={classes.chip}
          key="action"
          label={`Action: ${audit.filter.action}`}
          onDelete={handleDeleteActionFilter}
        />
      );
    }

    if (audit.filter.issuerId) {
      chips.push(
        <Chip
          className={classes.chip}
          key="issuer"
          label={`Issuer ID: ${audit.filter.issuerId}`}
          onDelete={handleDeleteIssuerFilter}
        />
      );
      if (audit.filter.subject) {
        chips.push(
          <Chip
            className={classes.chip}
            key="subject"
            label={`Subject: ${audit.filter.subject}`}
            onDelete={handleDeleteSubjectFilter}
          />
        );
      }
    }

    if (chips.length > 0) {
      return <div className={classes.chips}>{chips}</div>;
    }
    return null;
  }

  return (
    <React.Fragment>
      <ExplorerTable<Audit>
        firstRowMessage={firstRowMessage()}
        filterChips={<FilterChips />}
        rows={audit.data.data}
        headCells={headCells}
        defaultSortKey="timestamp"
        defaultSortOrder="desc"
        identityKey="id"
        title="System Activity"
        enableSelection={false}
        filterContent={
          <ActivityFilterContent
            filterMask={filterMask}
            filter={audit.filter}
            actionFilter={actionFilter}
            utc={utc}
            onReset={handleFilterReset}
            onApply={handleFilterApply}
          />
        }
      />
    </React.Fragment>
  );
}

type AuditProps = {
  filter: AuditFilter;
  actionFilter?: string[];
};

function AnalyticsAudit({ filter, actionFilter }: AuditProps) {
  const [history] = useHashHistory('audit', {});
  let filterOverride = filter;
  const { resource, action, from, to, issuerId, subject } = history;
  if (resource) {
    filterOverride = { resource, action, from, to, issuerId, subject };
  }

  if (!filterOverride.from && !filterOverride.to) {
    filterOverride.from = defaultFilterFrom;
  }
  if (!filterOverride.action) {
    filterOverride.action = defaultFilterAction;
  }
  if (!filter.from && !filter.to) {
    filter.from = defaultFilterFrom;
  }
  if (!filter.action) {
    filter.action = defaultFilterAction;
  }
  return (
    <AuditProvider filter={filterOverride}>
      <AnalyticsAuditImpl filterMask={filter} actionFilter={actionFilter} />
    </AuditProvider>
  );
}

export type IAnalyticsAuditProps = AuditProps;
export { AnalyticsAudit };
