import TextField from "@material-ui/core/TextField";
import Autocomplete from "@material-ui/lab/Autocomplete";
import SearchIcon from "@material-ui/icons/Search";
import React from "react";
import { useAgents } from "./AgentsProvider";
import { makeStyles } from "@material-ui/core/styles";
import { formatAgent } from "../lib/Fusebit";

const useStyles = makeStyles(theme => ({
  picker: {
    width: theme.spacing(40),
    minWidth: theme.spacing(40)
  }
}));

function AgentSelector({
  onSelected,
  onInputChange,
  fullWidth,
  variant,
  margin,
  disabled,
  error,
  helperText,
  label,
  ...rest
}: any) {
  const [agents] = useAgents();
  const classes = useStyles();
  const [open, setOpen] = React.useState(false);
  const [agentId, setAgentId] = React.useState("");

  if (agents.status === "error") {
    throw agents.error;
  }

  const options = (agents.status === "ready" && agents.existing) || [];
  const groupBy = (option: any) =>
    option.id.indexOf("clt-") === 0 ? "Clients" : "Users";

  const handleInputChange = (e: any, v: any) => {
    if (e) {
      setAgentId(v);
      onInputChange && onInputChange(v);
    }
  };

  return (
    <Autocomplete
      id="agentSelector"
      // freeSolo
      clearOnEscape
      // disableClearable
      // autoComplete
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      disabled={disabled || agents.status !== "ready" || false}
      inputValue={agentId || ""}
      onChange={(e, v) => onSelected && onSelected(v)}
      onInputChange={handleInputChange}
      options={options}
      getOptionLabel={formatAgent}
      groupBy={groupBy}
      loading={!!(open && agents.status === "loading")}
      renderInput={params => (
        <TextField
          {...params}
          label={label || "Select existing user or client"}
          variant={variant || "outlined"}
          className={fullWidth ? undefined : classes.picker}
          margin={margin}
          fullWidth={fullWidth || false}
          error={error || false}
          helperText={helperText || undefined}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <SearchIcon color="disabled" style={{ marginRight: -56 }} />
            )
          }}
        />
      )}
      {...rest}
    />
  );
}

export default AgentSelector;
