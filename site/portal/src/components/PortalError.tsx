import React from "react";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import CardActions from "@material-ui/core/CardActions";
import Typography from "@material-ui/core/Typography";
import Button from "@material-ui/core/Button";
import { FusebitError } from "./ErrorBoundary";

function PortalError({ error }: any) {
  const fusebitError = error.fusebit ? (error as FusebitError) : undefined;
  return (
    <Card square={true} raised={false} elevation={0}>
      <CardContent>
        <Typography variant="h6" color="primary" gutterBottom>
          {fusebitError ? fusebitError.message : "Something went wrong"}
        </Typography>
        <Typography variant="body1">
          {fusebitError ? fusebitError.fusebit.details : error.message}
        </Typography>
      </CardContent>
      {fusebitError && fusebitError.fusebit.actions && (
        <CardActions>
          {fusebitError.fusebit.actions.map((action, index) => (
            <Button key={index} href={action.url} size="small">
              {action.text}
            </Button>
          ))}
        </CardActions>
      )}
    </Card>
  );
}

export default PortalError;
