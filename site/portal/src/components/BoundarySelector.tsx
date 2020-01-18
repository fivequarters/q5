import TextField from "@material-ui/core/TextField";
import Autocomplete from "@material-ui/lab/Autocomplete";
import CircularProgress from "@material-ui/core/CircularProgress";
import React from "react";
import { useProfile } from "./ProfileProvider";
import loadBoundaries from "../effects/LoadBoundaries";

function BoundarySelector({
  subscriptionId,
  boundaryId,
  onChange,
  data,
  onNewData,
  fullWidth,
  variant,
  disabled,
  error,
  helperText,
  ...rest
}: any) {
  const { profile } = useProfile();
  const [open, setOpen] = React.useState(false);
  const loading =
    open && !!!(data && data.boundaries && data.boundaries[subscriptionId]);

  React.useEffect(
    loadBoundaries(
      profile,
      open ? subscriptionId : undefined,
      undefined,
      data,
      onNewData
    ),
    [data, onNewData, profile, subscriptionId, open]
  );

  if (
    data &&
    data.boundaries &&
    data.boundaries[subscriptionId] &&
    data.boundaries[subscriptionId].error
  ) {
    throw data.boundaries[subscriptionId].error;
  }

  const boundaries =
    (data &&
      data.boundaries &&
      data.boundaries[subscriptionId] &&
      data.boundaries[subscriptionId].data &&
      Object.keys(data.boundaries[subscriptionId].data)) ||
    [];

  return (
    <Autocomplete
      id="boundaryIdSelector"
      freeSolo
      disableClearable
      autoComplete
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      disabled={disabled || false}
      inputValue={boundaryId || ""}
      onInputChange={(e, v) => onChange && onChange(v)}
      options={boundaries}
      loading={!!(loading && subscriptionId)}
      renderInput={params => (
        <TextField
          {...params}
          label={boundaryId ? "Boundary" : "All boundaries"}
          variant={variant || "filled"}
          fullWidth={fullWidth || false}
          error={error || false}
          helperText={helperText || undefined}
          InputProps={{
            ...params.InputProps,
            endAdornment:
              loading && subscriptionId ? (
                <CircularProgress
                  color="primary"
                  size={20}
                  style={{ marginRight: -50, marginTop: -20 }}
                />
              ) : (
                params.InputProps.endAdornment
              )
          }}
        />
      )}
      {...rest}
    />
  );
}

export default BoundarySelector;
