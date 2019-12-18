import React from "react";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";

function ConfirmationDialog({
  title,
  content,
  cancelText,
  confirmText,
  onDone,
  ...rest
}: any) {
  return (
    <Dialog
      fullWidth={true}
      {...rest}
      onClose={() => onDone && onDone(false)}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">{title}</DialogTitle>
      <DialogContent>
        {typeof content === "string" && (
          <DialogContentText id="alert-dialog-description">
            {content}
          </DialogContentText>
        )}
        {typeof content !== "string" && content}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onDone && onDone(false)} color="primary">
          {cancelText || "Cancel"}
        </Button>
        <Button
          onClick={() => onDone && onDone(true)}
          color="primary"
          autoFocus
        >
          {confirmText || "Confirm"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ConfirmationDialog;
