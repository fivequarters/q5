import { makeStyles } from "@material-ui/core/styles";
import React from "react";
import BoundarySelector from "./BoundarySelector";
import FunctionSelector from "./FunctionSelector";
import { useProfile } from "./ProfileProvider";
import SubscriptionSelector from "./SubscriptionSelector";
import { BoundariesProvider } from "./BoundariesProvider";

const useStyles = makeStyles((theme: any) => ({
  inputField: {
    marginTop: theme.spacing(2)
  }
}));

function FunctionResourceSelector({
  resource,
  disabled,
  onResourceChange
}: any) {
  const classes = useStyles();
  const { profile } = useProfile();
  const subscriptionSelected =
    resource.parts.subscriptionId && resource.parts.subscriptionId !== "*";

  const handleSubscriptionIdChange = (subscriptionId: string) => {
    let parts = { ...resource.parts };
    parts.subscriptionId = subscriptionId;
    const trimmed = parts.subscriptionId.trim();
    if (
      trimmed.length > 0 &&
      trimmed !== "*" &&
      (trimmed.indexOf("sub-") !== 0 || trimmed.length !== 20)
    ) {
      parts.subscriptionIdError =
        "Subscription ID must have 20 characters and start with 'sub-'.";
    } else {
      delete parts.subscriptionIdError;
    }
    if (trimmed === "*") {
      parts.boundaryId = "";
      delete parts.boundaryIdError;
      parts.functionId = "";
      delete parts.functionIdError;
    }
    onResourceChange &&
      onResourceChange({
        ...resource,
        parts,
        hasError: hasError(parts),
        serialized: serializeResource(parts)
      });
  };

  const handleBoundaryIdChange = (value: string) => {
    let parts = { ...resource.parts };
    parts.boundaryId = value;
    const trimmed = parts.boundaryId.trim();
    if (trimmed.length > 0 && !trimmed.match(/^[a-z0-9-]{1,63}$/)) {
      parts.boundaryIdError =
        "Boundary ID must must have between 1 and 63 lowercase letters, digits, and dashes.";
    } else {
      delete parts.boundaryIdError;
    }
    onResourceChange &&
      onResourceChange({
        ...resource,
        parts,
        hasError: hasError(parts),
        serialized: serializeResource(parts)
      });
  };

  const handleFunctionIdChange = (value: string) => {
    let parts = { ...resource.parts };
    parts.functionId = value;
    const trimmed = parts.functionId.trim();
    if (trimmed.length > 0 && !trimmed.match(/^[a-z0-9-]{1,64}$/)) {
      parts.functionIdError =
        "Function ID must must have between 1 and 64 lowercase letters, digits, and dashes.";
    } else {
      delete parts.functionIdError;
    }
    onResourceChange &&
      onResourceChange({
        ...resource,
        parts,
        hasError: hasError(parts),
        serialized: serializeResource(parts)
      });
  };

  const hasError = (parts: any) =>
    !!(
      parts.subscriptionIdError ||
      parts.boundaryIdError ||
      parts.functionIdError
    );

  const serializeResource = (parts: any) => {
    let result = [`/account/${profile.account}/`];
    if (parts.subscriptionId && parts.subscriptionId !== "*") {
      result.push(`subscription/${parts.subscriptionId}/`);
      if (parts.boundaryId.trim()) {
        result.push(`boundary/${parts.boundaryId.trim()}/`);
        if (parts.functionId.trim()) {
          result.push(`function/${parts.functionId.trim()}/`);
        }
      }
    }
    return result.join("");
  };

  if (resource.serialized === undefined && onResourceChange) {
    onResourceChange({
      parts: { ...resource.parts },
      hasError: hasError(resource.parts),
      serialized: serializeResource(resource.parts)
    });
  }

  return (
    <React.Fragment>
      <SubscriptionSelector
        enableAnySubscription={true}
        subscriptionId={resource.parts.subscriptionId}
        onChange={handleSubscriptionIdChange}
        fullWidth
        variant="filled"
        autoFocus
        // className={classes.inputField}
        disabled={!!disabled}
      />
      <BoundariesProvider
        subscriptionId={
          subscriptionSelected ? resource.parts.subscriptionId : undefined
        }
      >
        <BoundarySelector
          subscriptionId={
            subscriptionSelected ? resource.parts.subscriptionId : undefined
          }
          boundaryId={resource.parts.boundaryId}
          disabled={!!disabled || !subscriptionSelected}
          fullWidth
          variant="filled"
          onChange={handleBoundaryIdChange}
          error={!!resource.parts.boundaryIdError}
          helperText={resource.parts.boundaryIdError}
          className={classes.inputField}
        />
        <FunctionSelector
          subscriptionId={
            subscriptionSelected && !resource.parts.boundaryIdError
              ? resource.parts.subscriptionId
              : undefined
          }
          boundaryId={
            resource.parts.boundaryIdError
              ? undefined
              : resource.parts.boundaryId
          }
          functionId={resource.parts.functionId}
          disabled={
            !!disabled ||
            !!!(
              subscriptionSelected &&
              resource.parts.boundaryId &&
              !resource.parts.boundaryIdError
            )
          }
          fullWidth
          variant="filled"
          onChange={handleFunctionIdChange}
          error={!!resource.parts.functionIdError}
          helperText={resource.parts.functionIdError}
          className={classes.inputField}
        />
      </BoundariesProvider>
    </React.Fragment>
  );
}

export default FunctionResourceSelector;
