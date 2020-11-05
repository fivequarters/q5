import Paper from '@material-ui/core/Paper';
import { lighten, makeStyles } from '@material-ui/core/styles';
import React from 'react';
import { CatalogTemplate } from '../lib/CatalogTypes';
import Icon from '@material-ui/core/Icon';
import Button from '@material-ui/core/Button';
import { Typography } from '@material-ui/core';
import { FusebitMark } from '@5qtrs/fusebit-mark';
import OpenInNewIcon from '@material-ui/icons/OpenInNew';

const useStyles = makeStyles((theme: any) => ({
  card: {
    minWidth: 302,
    maxWidth: 302,
    minHeight: 302,
    maxHeight: 302,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    margin: theme.spacing(1),
  },
  cardHeader: {
    width: '100%',
    minHeight: 140,
    backgroundColor: lighten(theme.palette.primary.light, 0.75),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 84,
  },
  cardDescription: {
    width: '100%',
    padding: theme.spacing(2),
    minHeight: 112,
    maxHeight: 112,
    overflow: 'hidden',
  },
  cardActions: {
    paddingLeft: theme.spacing(1),
    paddingRight: theme.spacing(1),
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(1),
  },
}));

type TemplateCardProps = {
  template: CatalogTemplate;
  installed?: boolean;
  disabled?: boolean;
  onCreate?: (template: CatalogTemplate) => void;
  onEditCode?: () => void;
  onEditMetadata?: () => void;
  onClone?: () => void;
};

function TemplateCard({
  template,
  disabled,
  installed,
  onCreate,
  onEditCode,
  onEditMetadata,
  onClone,
}: TemplateCardProps) {
  const classes = useStyles();
  return (
    <Paper className={classes.card} square={true}>
      <div>
        <div className={classes.cardHeader}>
          {!template.icon && <FusebitMark size={84} margin={0} />}
          {template.icon &&
            (template.icon.startsWith('http') ? (
              <img alt="" width={84} height={84} src={template.icon} />
            ) : (
              <Icon fontSize="inherit" color="primary">
                {template.icon}
              </Icon>
            ))}
        </div>
        <div className={classes.cardDescription}>
          <Typography variant="h6">{template.name}</Typography>
          <Typography>{template.description}</Typography>
        </div>
      </div>
      <div className={classes.cardActions}>
        {installed && (
          <React.Fragment>
            <Button
              variant="text"
              color="primary"
              size="small"
              onClick={() => onEditCode && onEditCode()}
              disabled={disabled}
            >
              Edit
            </Button>
            <Button
              variant="text"
              color="primary"
              size="small"
              onClick={() => onEditMetadata && onEditMetadata()}
              disabled={disabled}
            >
              Metadata
            </Button>
            <Button
              variant="text"
              color="primary"
              size="small"
              onClick={() => onClone && onClone()}
              disabled={disabled}
            >
              Clone
            </Button>
          </React.Fragment>
        )}
        {!installed && (
          <Button
            variant="text"
            color="secondary"
            size="small"
            onClick={onCreate && (() => onCreate(template))}
            disabled={!template.managerUrl || disabled}
          >
            Create
          </Button>
        )}
        {template.documentationUrl && (
          <Button
            variant="text"
            color="primary"
            target="_blank"
            href={template.documentationUrl}
            size="small"
            endIcon={<OpenInNewIcon />}
          >
            Learn
          </Button>
        )}
      </div>
    </Paper>
  );
}

export default TemplateCard;
