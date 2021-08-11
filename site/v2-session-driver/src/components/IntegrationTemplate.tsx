import React, { MouseEventHandler, ReactElement } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Card from '@material-ui/core/Card';
import CardHeader from '@material-ui/core/CardHeader';
import CardContent from '@material-ui/core/CardContent';
import CardActions from '@material-ui/core/CardActions';
import Avatar from '@material-ui/core/Avatar';
import Typography from '@material-ui/core/Typography';
import { red } from '@material-ui/core/colors';
import { ButtonGroup, Button } from '@material-ui/core';
import Grid from '@material-ui/core/Grid';

const useStyles = makeStyles(() => ({
  root: {
    maxWidth: 345,
    flexGrow: 1,
  },
  avatar: {
    backgroundColor: red[500],
  },
}));

export type IntegrationProps = {
  displayName: string;
  integrationTypeDescription: string;
  description: string;
  logo: string;
  onCreateClick: MouseEventHandler<HTMLButtonElement>;
  onDeleteClick: MouseEventHandler<HTMLButtonElement>;
};

export function IntegrationTemplate({
  displayName,
  logo,
  integrationTypeDescription,
  description,
  onCreateClick,
  onDeleteClick,
}: IntegrationProps): ReactElement {
  const classes = useStyles();

  return (
    <Grid item>
      <Card className={classes.root}>
        <CardHeader
          avatar={<Avatar aria-label={displayName} src={logo} className={classes.avatar}></Avatar>}
          title={displayName}
          subheader={integrationTypeDescription}
        />
        <CardContent>
          <Typography variant="body2" color="textSecondary" component="p">
            {description}
          </Typography>
        </CardContent>
        <CardActions disableSpacing>
          <ButtonGroup variant="contained" color="primary" aria-label="contained primary button group">
            <Button onClick={onCreateClick}>Create</Button>
            <Button onClick={onDeleteClick}>Delete</Button>
          </ButtonGroup>
        </CardActions>
      </Card>
    </Grid>
  );
}
