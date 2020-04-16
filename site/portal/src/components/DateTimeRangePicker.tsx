import Grid from "@material-ui/core/Grid";
import MenuItem from "@material-ui/core/MenuItem";
import TextField from "@material-ui/core/TextField";
import React from "react";

export const defaultFilterFrom = "-1h";

const rangePresets = [
  { value: "-15m", description: "Last 15 minutes" },
  { value: "-30m", description: "Last 30 minutes" },
  { value: "-1h", description: "Last 1 hour" },
  { value: "-24h", description: "Last 24 hours" },
  { value: "-7d", description: "Last 7 days" },
  { value: "-30d", description: "Last 30 days" },
  { value: "custom", description: "Custom" },
];

const pad = (i: number) => (i < 10 ? "0" + i : i.toString());

/**
 * from - ISO date or one of: -15m, -30m, -1h, -24h, -7d, -30d
 * to - If specified, ISO date
 * onChange - Called whenever selected time range changes.
 *            "from" can be one of -15m, -30m, -1h, -24h, -7d, -30d, or an ISO date in case a custom range was selected.
 *            "to" is an ISO date in case a custom range was selected, undefined otherwise.
 * utc - whether custom date selection is done in UTC time (true) or local time (false). Default true.
 */
type DateTimeRangePickerProps = {
  from?: string;
  to?: string;
  onChange?: (from: string, to: string | undefined) => void;
  utc?: boolean;
};

function DateTimeRangePicker({
  from,
  to,
  onChange,
  utc,
}: DateTimeRangePickerProps) {
  utc = utc === undefined ? true : utc;
  from = from || defaultFilterFrom;
  to = to || new Date().toISOString();

  let customFrom: string;
  if (from[0] !== "-") {
    customFrom = from;
    from = "custom";
  } else {
    if (rangePresets.findIndex((v) => v.value === from) === -1) {
      throw new Error(
        "Unsupported 'from' value. Allowed values are: " +
          rangePresets.map((v) => v.value).join(", ") +
          ", or an ISO-formatted date string."
      );
    }
    customFrom = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(); // now - 1h
  }

  const handlePresetChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    from = event.target.value as string;
    onChange &&
      onChange(
        from === "custom" ? customFrom : from,
        (from === "custom" && to) || undefined
      );
  };

  const getUTCDate = (date: string) => {
    // yyyy-MM-ddThh:mm:ss
    const d = new Date(utc ? `${date}Z` : date);
    return d.toISOString();
  };

  const handleFromChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    customFrom = getUTCDate(event.target.value as string);
    onChange && onChange(customFrom, to);
  };

  const handleToChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    to = getUTCDate(event.target.value as string);
    onChange && onChange((from === "custom" ? customFrom : from) || "", to);
  };

  const formatPickerDate = (utcDate: string) => {
    // yyyy-MM-ddThh:mm:ss
    const d = new Date(utcDate);
    return utc
      ? `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(
          d.getUTCDate()
        )}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(
          d.getUTCSeconds()
        )}`
      : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
          d.getHours()
        )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <TextField
          id="presetSelector"
          value={from}
          margin="dense"
          label="Time range"
          select
          variant="outlined"
          fullWidth
          onChange={handlePresetChange}
        >
          {rangePresets.map((a: any) => (
            <MenuItem
              key={a.value}
              value={a.value}
              className="fusebit-prevent-clickaway"
            >
              {a.description}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      {from === "custom" && (
        <React.Fragment>
          <Grid item xs={6}>
            <TextField
              id="fromSelector"
              margin="dense"
              label={utc ? "Start time (UTC)" : "Start time (local)"}
              variant="outlined"
              type="datetime-local"
              value={formatPickerDate(customFrom)}
              onChange={handleFromChange}
              fullWidth
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              id="toSelector"
              margin="dense"
              label={utc ? "End time (UTC)" : "End time (local)"}
              variant="outlined"
              type="datetime-local"
              value={formatPickerDate(to)}
              onChange={handleToChange}
              fullWidth
            />
          </Grid>
        </React.Fragment>
      )}
    </Grid>
  );
}

export default DateTimeRangePicker;
