import TextField from "@material-ui/core/TextField";
import Autocomplete from "@material-ui/lab/Autocomplete";
import CircularProgress from "@material-ui/core/CircularProgress";
import React from "react";
import { useBoundaries } from "./BoundariesProvider";

function BoundarySelector({
  subscriptionId,
  boundaryId,
  onChange,
  fullWidth,
  variant,
  disabled,
  error,
  label,
  helperText,
  ...rest
}: any) {
  const [boundaries] = useBoundaries();
  const [open, setOpen] = React.useState(false);

  if (boundaries.status === "error") {
    throw boundaries.error;
  }

  const boundaryIds =
    (boundaries.status === "ready" && Object.keys(boundaries.existing)) || [];

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
      onInputChange={(e, v) => e && onChange && onChange(v)}
      options={boundaryIds}
      loading={!!(open && boundaries.status === "loading" && subscriptionId)}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label || boundaryId ? "Boundary" : "All boundaries"}
          variant={variant || "filled"}
          fullWidth={fullWidth || false}
          error={error || false}
          helperText={helperText || undefined}
          InputProps={{
            ...params.InputProps,
            endAdornment:
              open && boundaries.status === "loading" && subscriptionId ? (
                <CircularProgress
                  color="primary"
                  size={20}
                  style={{ marginRight: -50, marginTop: -20 }}
                />
              ) : (
                params.InputProps.endAdornment
              ),
          }}
        />
      )}
      {...rest}
    />
  );
}

export default BoundarySelector;
