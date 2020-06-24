import Grid from '@material-ui/core/Grid';
import InputAdornment from '@material-ui/core/InputAdornment';
import LinearProgress from '@material-ui/core/LinearProgress';
import { makeStyles } from '@material-ui/core/styles';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import DescriptionIcon from '@material-ui/icons/Description';
import SearchIcon from '@material-ui/icons/Search';
import React from 'react';
import { CatalogTemplate } from '../lib/CatalogTypes';
import { useBoundaries } from './BoundariesProvider';
import { useCatalog } from './CatalogProvider';
import FunctionNameSelector from './FunctionNameSelector';
import PortalError from './PortalError';
import { useProfile } from './ProfileProvider';
import TemplateCard from './TemplateCard';

const useStyles = makeStyles((theme: any) => ({
  gridContainer2: {
    paddingLeft: theme.spacing(3),
    paddingRight: theme.spacing(3),
    marginBottom: theme.spacing(2),
    marginTop: theme.spacing(1),
  },
  gridContainer: {
    paddingLeft: theme.spacing(3),
    paddingRight: theme.spacing(3),
    marginBottom: theme.spacing(2),
  },
  form: {
    overflow: 'hidden',
  },
  templatesTitleContainer: {
    display: 'inline-flex',
  },
  templatesTitle: {
    paddingLeft: theme.spacing(1),
  },
  templatesIcon: {
    paddingTop: 2,
  },
  templatesToolbar: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gallery: {
    display: 'flex',
    flexWrap: 'wrap',
  },
}));

function NewFunction({ subscriptionId, boundaryId }: any) {
  const classes = useStyles();
  const { profile } = useProfile();
  const [catalog] = useCatalog();
  const [boundaries] = useBoundaries();
  const [name, setName] = React.useState<any>({
    functionId: '',
    boundaryId: boundaryId || '',
    disabled: true,
  });
  const [search, setSearch] = React.useState('');

  if (boundaries.status === 'loading' || catalog.status === 'loading') {
    return (
      <Grid container className={classes.gridContainer} spacing={2}>
        <Grid item xs={12}>
          <LinearProgress />
        </Grid>
      </Grid>
    );
  }

  if (boundaries.status === 'error') {
    return <PortalError error={boundaries.error} padding={true} />;
  }

  if (catalog.status === 'error') {
    return (
      <Grid container className={classes.gridContainer} spacing={2}>
        <Grid item xs={12}>
          <PortalError error={catalog.error} />
        </Grid>
      </Grid>
    );
  }

  const handleSearchChange = (event: any) => {
    setSearch(event.target.value);
  };

  const handleCreate = (template: CatalogTemplate) => {
    const data = Buffer.from(
      JSON.stringify({
        baseUrl: profile.baseUrl,
        accountId: profile.account,
        subscriptionId,
        boundaryId: name.boundaryId,
        functionId: name.functionId,
        templateName: template.name,
      })
    ).toString('base64');

    let url = `${template.managerUrl}/configure?data=${encodeURIComponent(data)}&returnTo=${encodeURIComponent(
      `${window.location.protocol}//${window.location.host}${window.location.pathname}${
        window.location.pathname[window.location.pathname.length - 1] === '/' ? '' : '/'
      }${template.id}`
    )}`;

    window.location.href = url;
  };

  const filter = search.trim().toLowerCase();
  const templates = filter
    ? catalog.existing.templates.reduce((previous: CatalogTemplate[], current: CatalogTemplate) => {
        if (current.name.toLowerCase().indexOf(filter) > -1 || current.description.toLowerCase().indexOf(filter) > -1) {
          previous.push(current);
        }
        return previous;
      }, [])
    : catalog.existing.templates;

  return (
    <React.Fragment>
      <Grid container spacing={2} className={classes.gridContainer2}>
        <Grid item xs={8} className={classes.form}>
          <FunctionNameSelector
            subscriptionId={subscriptionId}
            boundaryEnabled={boundaryId === undefined}
            name={name}
            onNameChange={(newName: any) => setName(newName)}
          />
        </Grid>
      </Grid>
      <Grid container spacing={2} className={classes.gridContainer}>
        <Grid item xs={12} className={classes.templatesToolbar}>
          <div className={classes.templatesTitleContainer}>
            <div className={classes.templatesIcon}>
              <DescriptionIcon />
            </div>
            <Typography variant="h6" className={classes.templatesTitle}>
              Templates
            </Typography>
          </div>
          <TextField
            placeholder="Search templates"
            id="templateSearch"
            margin="dense"
            value={search}
            onChange={handleSearchChange}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            variant="outlined"
          />
        </Grid>
        <Grid item xs={12} className={classes.gallery}>
          {templates.length === 0 && <Typography>No matching templates found</Typography>}
          {templates.length > 0 &&
            templates.map((template) => (
              <TemplateCard key={template.id} template={template} disabled={name.disabled} onCreate={handleCreate} />
            ))}
        </Grid>
      </Grid>
    </React.Fragment>
  );
}

export default NewFunction;
