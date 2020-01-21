import TextField from "@material-ui/core/TextField";
import Autocomplete from "@material-ui/lab/Autocomplete";
import CircularProgress from "@material-ui/core/CircularProgress";
import React from "react";
import { useProfile } from "./ProfileProvider";
import loadBoundaries from "../effects/LoadBoundaries";

function FunctionSelector({
  subscriptionId,
  boundaryId,
  functionId,
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
  const [open, setOpen] = React.useState(false);
  const { profile } = useProfile();
  const loading =
    open && !!!(data && data.boundaries && data.boundaries[subscriptionId]);

  React.useEffect(
    loadBoundaries(
      profile,
      boundaryId ? subscriptionId : undefined,
      undefined,
      data,
      onNewData
    ),
    [data, onNewData, profile, subscriptionId, boundaryId]
  );

  if (
    data &&
    data.boundaries &&
    data.boundaries[subscriptionId] &&
    data.boundaries[subscriptionId].error
  ) {
    throw data.boundaries[subscriptionId].error;
  }

  const functions =
    (data &&
      data.boundaries &&
      data.boundaries[subscriptionId] &&
      data.boundaries[subscriptionId].data &&
      data.boundaries[subscriptionId].data[boundaryId] &&
      data.boundaries[subscriptionId].data[boundaryId].functions.map(
        (f: any) => f.functionId
      )) ||
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
      onInputChange={(e, v) => onChange && onChange(v)}
      options={functions}
      loading={!!(loading && subscriptionId && boundaryId)}
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
              loading && subscriptionId && boundaryId ? (
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
