import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import CardActions from "@material-ui/core/CardActions";
import Button from "@material-ui/core/Button";
import OpenInNewIcon from "@material-ui/icons/OpenInNew";

const useStyles = makeStyles(theme => ({
  card: {
    borderLeft: "solid 1px lightgray",
    backgroundColor: "inherit"
  }
}));

function InfoCard({ children, learnMoreUrl }: any) {
  const classes = useStyles();

  return (
    <Card square={true} raised={false} elevation={0} className={classes.card}>
      <CardContent>{children}</CardContent>
      {learnMoreUrl && (
        <CardActions>
          <Button
            color="primary"
            target="_blank"
            href={learnMoreUrl}
            size="small"
            endIcon={<OpenInNewIcon />}
          >
            Learn more
          </Button>
        </CardActions>
      )}
    </Card>
  );
}

export default InfoCard;
