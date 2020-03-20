import LinearProgress from "@material-ui/core/LinearProgress";
import TextField from "@material-ui/core/TextField";
import FlipIcon from "@material-ui/icons/Flip";
import LabelIcon from "@material-ui/icons/Label";
import React from "react";
import { useBoundaries } from "./BoundariesProvider";
import BoundarySelector from "./BoundarySelector";
import InputWithIcon from "./InputWithIcon";
import PortalError from "./PortalError";

function FunctionNameSelector({
  subscriptionId,
  boundaryEnabled,
  name,
  onNameChange
}: any) {
  const [boundaries] = useBoundaries();

  if (boundaries.status === "loading") {
    return <LinearProgress />;
  }

  if (boundaries.status === "error") {
    return <PortalError error={boundaries.error} padding={true} />;
  }

  const isDisabled = (name: any) =>
    !!!(
      name.functionId.trim() &&
      name.boundaryId.trim() &&
      !name.functionIdError &&
      !name.boundaryIdError
    );

  const handleFunctionIdChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const trimmed = event.target.value.trim();
    const boundary = boundaries.existing[name.boundaryId];
    if (!trimmed.match(/^[a-z0-9-]{1,64}$/)) {
      name.functionIdError =
        "Required. Must be a 1-64 character string consisting of lowercase letters, numbers, and hyphens.";
      name.functionNameConflict = false;
    } else if (
      boundary &&
      boundary.functions.find(f => f.functionId === trimmed)
    ) {
      name.functionIdError = `Function '${trimmed}' already exists in boundary '${name.boundaryId}', choose a different name.`;
      name.functionNameConflict = true;
    } else {
      delete name.functionIdError;
      name.functionNameConflict = false;
      if (name.boundaryNameConflict) {
        name.boundaryNameConflict = false;
        delete name.boundaryIdError;
      }
    }
    name.functionId = event.target.value;
    onNameChange && onNameChange({ ...name, disabled: isDisabled(name) });
  };

  const handleBoundaryIdChange = (value: string) => {
    const trimmed = value.trim();
    const boundary = boundaries.existing[trimmed];
    if (!trimmed.match(/^[a-z0-9-]{1,63}$/)) {
      name.boundaryIdError =
        "Required. Must be a 1-63 character string consisting of lowercase letters, numbers, and hyphens.";
      name.boundaryNameConflict = false;
    } else if (
      boundary &&
      boundary.functions.find(f => f.functionId === name.functionId)
    ) {
      name.boundaryIdError = `Boundary '${trimmed}' already contains function '${name.functionId}', choose a different name.`;
      name.boundaryNameConflict = true;
    } else {
      delete name.boundaryIdError;
      name.boundaryNameConflict = false;
      if (name.functionNameConflict) {
        name.functionNameConflict = false;
        delete name.functionIdError;
      }
    }
    name.boundaryId = value;
    onNameChange && onNameChange({ ...name, disabled: isDisabled(name) });
  };

  return (
    <React.Fragment>
      <InputWithIcon icon={<LabelIcon />}>
        <TextField
          id="functionId"
          label="Name"
          variant="outlined"
          value={name.functionId}
          helperText={name.functionIdError || "Required"}
          error={!!name.functionIdError}
          onChange={handleFunctionIdChange}
          fullWidth
          autoFocus
        />
      </InputWithIcon>
      {boundaryEnabled && (
        <InputWithIcon icon={<FlipIcon />}>
          <BoundarySelector
            subscriptionId={subscriptionId}
            boundaryId={name.boundaryId}
            fullWidth
            variant="outlined"
            onChange={handleBoundaryIdChange}
            helperText={name.boundaryIdError || "Required"}
            error={!!name.boundaryIdError}
            label="Boundary"
          />
        </InputWithIcon>
      )}
    </React.Fragment>
  );
}

export default FunctionNameSelector;
