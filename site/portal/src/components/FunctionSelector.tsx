import TextField from "@material-ui/core/TextField";
import Autocomplete from "@material-ui/lab/Autocomplete";
import CircularProgress from "@material-ui/core/CircularProgress";
import React from "react";
import { useBoundaries } from "./BoundariesProvider";

function FunctionSelector({
  subscriptionId,
  boundaryId,
  functionId,
  onChange,
  fullWidth,
  variant,
  disabled,
  error,
  helperText,
  ...rest
}: any) {
  const [open, setOpen] = React.useState(false);
  const [boundaries] = useBoundaries();

  if (boundaries.status === "error") {
    throw boundaries.error;
  }

  const functions =
    (boundaries.status === "ready" &&
      boundaries.existing[boundaryId] &&
      boundaries.existing[boundaryId].functions.map(f => f.functionId)) ||
    [];

  return (
    <Autocomplete
      id="functionIdSelector"
      freeSolo
      disableClearable
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      disabled={disabled || false}
      inputValue={functionId || ""}
      onInputChange={(e, v) => e && onChange && onChange(v)}
      options={functions}
      loading={
        !!(
          open &&
          boundaries.status === "loading" &&
          subscriptionId &&
          boundaryId
        )
      }
      renderInput={params => (
        <TextField
          {...params}
          label={functionId ? "Function" : "All functions"}
          variant={variant || "filled"}
          fullWidth={fullWidth || false}
          error={error || false}
          helperText={helperText || undefined}
          InputProps={{
            ...params.InputProps,
            endAdornment:
              open &&
              boundaries.status === "loading" &&
              subscriptionId &&
              boundaryId ? (
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

export default FunctionSelector;
