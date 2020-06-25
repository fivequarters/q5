import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import MenuItem from '@material-ui/core/MenuItem';
import Typography from '@material-ui/core/Typography';
import Radio from '@material-ui/core/Radio';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import { makeStyles } from '@material-ui/core/styles';
import TextField from '@material-ui/core/TextField';
import React from 'react';
import { actions } from '../lib/Actions';
import { AuditFilter } from '../lib/FusebitTypes';
import DateTimeRangePicker from './DateTimeRangePicker';

export const defaultFilterFrom = '-1h';
export const defaultFilterAction = '*';

const useStyles = makeStyles((theme: any) => ({
  filterRoot: {
    paddingLeft: theme.spacing(2),
    paddingRight: theme.spacing(2),
    minWidth: 650,
    maxWidth: 650,
  },
  filterActions: {
    display: 'inline-flex',
    justifyContent: 'flex-end',
  },
  filterInputs: {
    padding: theme.spacing(1),
  },
  filterInput: {
    marginBottom: theme.spacing(1),
  },
}));

type ActivityFilterContentProps = {
  filterMask?: AuditFilter;
  filter: AuditFilter;
  actionFilter?: string[];
  utc?: boolean;
  onReset: () => void;
  onApply: (filter: AuditFilter, utc: boolean) => void;
};

function ActivityFilterContent({
  filterMask,
  filter,
  actionFilter,
  utc,
  onReset,
  onApply,
}: ActivityFilterContentProps) {
  const [data, setData] = React.useState<any>({
    resource:
      (filterMask &&
        filterMask.resource &&
        filter.resource &&
        filter.resource.indexOf(filterMask.resource) > -1 &&
        filter.resource.substring(filterMask.resource.length)) ||
      '',
    action: filter.action || '*',
    issuerId: filter.issuerId || '',
    subject: filter.subject || '',
    from: filter.from || defaultFilterFrom,
    to: filter.to || '',
    utc,
  });
  const classes = useStyles();

  const handleResourceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setData({ ...data, resource: event.target.value });
  };

  const handleIssuerChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setData({ ...data, issuerId: event.target.value });
  };

  const handleSubjectChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setData({ ...data, subject: event.target.value });
  };

  const handleActionChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setData({ ...data, action: event.target.value as string });
  };

  const handleRangeChange = (from: string, to?: string) => {
    setData({ ...data, from, to: to || undefined });
  };

  const handleUtcChange = () => {
    setData({ ...data, utc: !data.utc });
  };

  let allowedActions = [{ action: '*', description: 'Any action' }];
  if (actionFilter) {
    actions.forEach((a) => {
      for (var i = 0; i < actionFilter.length; i++) {
        if (a.action.indexOf(actionFilter[i]) === 0) {
          allowedActions.push(a);
          break;
        }
      }
    });
  } else {
    allowedActions = [...allowedActions, ...actions];
  }

  const handleApply = () => {
    let filter: AuditFilter = {};
    if (data.resource || (filterMask && filterMask.resource))
      filter.resource =
        filterMask && filterMask.resource
          ? filterMask.resource + (data.resource || '').trim()
          : (data.resource || '').trim();
    if (data.action && data.action !== '*') filter.action = data.action;
    if (data.issuerId) {
      filter.issuerId = data.issuerId.trim();
      if (data.subject) filter.subject = data.subject.trim();
    }
    if (data.from) {
      filter.from = data.from;
      if (data.to) filter.to = data.to;
    }
    onApply(filter, data.utc);
  };

  return (
    <Grid container className={classes.filterRoot} spacing={2}>
      <Grid item xs={12}>
        <TextField
          id="resourceFilter"
          margin="dense"
          label="Resource (prefix match)"
          helperText={
            filterMask && filterMask.resource ? `Value will be prefixed with '${filterMask.resource}'` : undefined
          }
          variant="outlined"
          value={data.resource}
          onChange={handleResourceChange}
          fullWidth
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          id="actionFilter"
          value={data.action}
          label="Action"
          // helperText="Requested action"
          margin="dense"
          variant="outlined"
          fullWidth
          select
          onChange={handleActionChange}
        >
          {allowedActions.map((a: any) => (
            <MenuItem key={a.action} value={a.action} className="fusebit-prevent-clickaway">
              <strong className="fusebit-prevent-clickaway">{a.action}</strong>
              &nbsp;-&nbsp;{a.description}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={12}>
        <TextField
          id="issuerFilter"
          margin="dense"
          label="Issuer ID (exact match)"
          // helperText="Exact match the issuer ID"
          variant="outlined"
          value={data.issuerId}
          onChange={handleIssuerChange}
          fullWidth
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          id="subjectFilter"
          margin="dense"
          label="Subject (exact match, requires Issuer ID)"
          // helperText="Exact match the subject. Requires Issuer ID"
          variant="outlined"
          value={data.subject}
          disabled={data.issuerId.trim() === ''}
          onChange={handleSubjectChange}
          fullWidth
        />
      </Grid>
      <Grid item xs={12}>
        <DateTimeRangePicker from={data.from} to={data.to} utc={data.utc} onChange={handleRangeChange} />
      </Grid>
      <Grid item xs={12}>
        <Typography component="div" variant="body2">
          <Grid component="label" container alignItems="center" spacing={2}>
            <Grid item>Show time as:</Grid>
            <Grid item>
              <FormControlLabel
                value="utc"
                control={<Radio color="secondary" checked={data.utc} size="small" onChange={handleUtcChange} />}
                label={<Typography variant="body2">UTC</Typography>}
              />
            </Grid>
            <Grid item>
              <FormControlLabel
                value="local"
                control={<Radio color="secondary" checked={!data.utc} size="small" onChange={handleUtcChange} />}
                label={<Typography variant="body2">Local</Typography>}
              />
            </Grid>
          </Grid>
        </Typography>
      </Grid>
      <Grid item xs={12} className={classes.filterActions}>
        <Button variant="text" onClick={onReset} color="primary">
          Reset
        </Button>
        <Button variant="text" color="secondary" onClick={handleApply}>
          Apply
        </Button>
      </Grid>
    </Grid>
  );
}

export default ActivityFilterContent;
