import Button from "@material-ui/core/Button";
import FormControl from "@material-ui/core/FormControl";
import Grid from "@material-ui/core/Grid";
import InputLabel from "@material-ui/core/InputLabel";
import LinearProgress from "@material-ui/core/LinearProgress";
import MenuItem from "@material-ui/core/MenuItem";
import Paper from "@material-ui/core/Paper";
import Select from "@material-ui/core/Select";
import { lighten, makeStyles } from "@material-ui/core/styles";
import TextField from "@material-ui/core/TextField";
import Typography from "@material-ui/core/Typography";
import FingerprintIcon from "@material-ui/icons/Fingerprint";
import LabelIcon from "@material-ui/icons/Label";
import VpnKeyIcon from "@material-ui/icons/VpnKey";
import React from "react";
import { getIssuer, updateIssuer } from "../lib/Fusebit";
import AddPublicKeyDialog from "./AddPublicKeyDialog";
import ConfirmNavigation from "./ConfirmNavigation";
import { FusebitError } from "./ErrorBoundary";
import InfoCard from "./InfoCard";
import PortalError from "./PortalError";
import { useProfile } from "./ProfileProvider";
import SaveFab from "./SaveFab";
import InputWithIcon from "./InputWithIcon";
import EntityCard from "./EntityCard";

const useStyles = makeStyles((theme: any) => ({
  gridContainer: {
    paddingLeft: theme.spacing(3),
    paddingRight: theme.spacing(3),
    marginBottom: theme.spacing(2)
  },
  keyContainer: {
    paddingLeft: theme.spacing(1) + 24,
    width: "100%",
    display: "flex",
    flexDirection: "column",
    minWidth: 480
  },
  keyAction: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2)
  },
  form: {
    overflow: "hidden"
  }
}));

function IssuerOverview({ data, match }: any) {
  const classes = useStyles();
  const { profile } = useProfile();
  const { params } = match;
  let { issuerId } = params;
  issuerId = (issuerId && decodeURIComponent(issuerId)) || undefined;
  const [issuer, setIssuer] = React.useState<any>(undefined);
  const [addPublicKeyDialogOpen, setAddPublicKeyDialogOpen] = React.useState(
    false
  );

  const createIssuerState = (data: any) =>
    data.error
      ? data
      : {
          existing: data,
          modified: {
            ...JSON.parse(JSON.stringify(data)),
            publicKeyAcquisition: data.publicKeys ? "pki" : "jwks"
          }
        };

  React.useEffect(() => {
    let cancelled: boolean = false;
    if (issuer === undefined) {
      (async () => {
        let data: any;
        try {
          data = await getIssuer(profile, issuerId as string);
        } catch (e) {
          data = {
            error: new FusebitError("Error loading issuer information", {
              details:
                (e.status || e.statusCode) === 403
                  ? "You are not authorized to access the issuer information."
                  : e.message || "Unknown error."
            })
          };
        }
        !cancelled && setIssuer(createIssuerState(data));
      })();
      return () => {
        cancelled = true;
      };
    }
  }, [issuer, profile, issuerId]);

  if (!issuer) {
    return (
      <Grid container className={classes.gridContainer} spacing={2}>
        <Grid item xs={12}>
          <LinearProgress />
        </Grid>
      </Grid>
    );
  }

  if (issuer.error) {
    return (
      <Grid container className={classes.gridContainer} spacing={2}>
        <Grid item xs={12}>
          <PortalError error={issuer.error} />
        </Grid>
      </Grid>
    );
  }

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    issuer.modified.displayName = event.target.value;
    setIssuer({ ...issuer });
  };

  const handlePublicKeyAcquisitionChange = (
    event: React.ChangeEvent<{ value: unknown }>
  ) => {
    issuer.modified.publicKeyAcquisition = event.target.value;
    updateErrorStates(issuer);
    setIssuer({ ...issuer });
  };

  const updateErrorStates = (issuer: any) => {
    if (issuer && issuer.modified) {
      if (
        issuer.modified.publicKeyAcquisition === "jwks" &&
        (!issuer.modified.jsonKeysUrl ||
          !issuer.modified.jsonKeysUrl.trim().match(/^https:\/\//i))
      ) {
        issuer.modified.jsonKeysUrlError =
          "Required. The JWKS endpoint must be a secure https:// URL";
      } else {
        delete issuer.modified.jsonKeysUrlError;
      }
    }
    return issuer;
  };

  const handleJsonKeyUrlChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    issuer.modified.jsonKeysUrl = event.target.value;
    updateErrorStates(issuer);
    setIssuer({ ...issuer });
  };

  const handleRemovePublicKey = (pki: any) => {
    const i = issuer.modified.publicKeys.indexOf(pki);
    if (i > -1) {
      issuer.modified.publicKeys.splice(i, 1);
      setIssuer({ ...issuer });
    }
  };

  const handleAddPublicKey = (key: any) => {
    setAddPublicKeyDialogOpen(false);
    if (key) {
      issuer.modified.publicKeys.push(key);
      setIssuer({ ...issuer });
    }
  };

  const normalizeIssuer = (issuer: any) => {
    let normalized: any = {
      id: issuer.id
    };
    if (issuer.displayName !== undefined) {
      normalized.displayName = issuer.displayName.trim();
    }
    if (
      (issuer.publicKeyAcquisition === undefined ||
        issuer.publicKeyAcquisition === "pki") &&
      issuer.publicKeys
    ) {
      normalized.publicKeys = issuer.publicKeys.sort((a: any, b: any) =>
        a.keyId > b.keyId ? -1 : a.keyId < b.keyId ? 1 : 0
      );
    }
    if (
      (issuer.publicKeyAcquisition === undefined ||
        issuer.publicKeyAcquisition === "jwks") &&
      issuer.jsonKeysUrl
    ) {
      normalized.jsonKeysUrl = issuer.jsonKeysUrl.trim();
    }
    return normalized;
  };

  const isDirty = () => {
    const existing = normalizeIssuer(issuer.existing);
    const modified = normalizeIssuer(issuer.modified);
    const isDirty = JSON.stringify(existing) !== JSON.stringify(modified);
    return isDirty;
  };

  const isError = () => {
    return !!(
      issuer &&
      issuer.modified.publicKeyAcquisition === "jwks" &&
      issuer.modified.jsonKeysUrlError
    );
  };

  const handleSave = async () => {
    let data: any;
    try {
      data = await updateIssuer(profile, normalizeIssuer(issuer.modified));
    } catch (e) {
      data = {
        error: new FusebitError("Error saving issuer changes", {
          details:
            (e.status || e.statusCode) === 403
              ? "You are not authorized to make issuer changes."
              : e.message || "Unknown error.",
          actions: [
            {
              text: "Back to issuer",
              func: () => setIssuer(undefined)
            }
          ]
        })
      };
    }
    setIssuer(updateErrorStates(createIssuerState(data)));
  };

  function PublicKeys() {
    return (
      <div className={classes.keyContainer}>
        <div>
          {issuer.modified.publicKeys.length === 0 ? (
            <Typography>
              No public keys are stored. You can provide up to three stored
              public keys.
            </Typography>
          ) : (
            <Typography>
              You can provide up to three stored public keys.
            </Typography>
          )}
        </div>
        {issuer.modified.publicKeys.map((pki: any) => (
          <EntityCard
            key={pki.keyId}
            onRemove={() => handleRemovePublicKey(pki)}
            icon={<VpnKeyIcon fontSize="inherit" color="secondary" />}
          >
            <div>
              <Typography variant="h6">{pki.keyId}</Typography>
              <Typography variant="body2">First used: N/A</Typography>
              <Typography variant="body2">Last used: N/A</Typography>
            </div>
          </EntityCard>
        ))}
        <div className={classes.keyAction}>
          <Button
            variant="outlined"
            color="secondary"
            disabled={issuer.modified.publicKeys.length >= 3}
            onClick={() => setAddPublicKeyDialogOpen(true)}
          >
            Add public key
          </Button>
        </div>
        {addPublicKeyDialogOpen && (
          <AddPublicKeyDialog
            onClose={handleAddPublicKey}
            issuer={issuer.modified}
          />
        )}
      </div>
    );
  }

  return (
    <Grid container spacing={2} className={classes.gridContainer}>
      <Grid item xs={8} className={classes.form}>
        <form noValidate autoComplete="off">
          <InputWithIcon icon={<FingerprintIcon />}>
            <TextField
              id="issuerId"
              label="Issuer ID"
              variant="outlined"
              disabled
              value={issuer.existing.id}
              helperText="This is the value of the iss claim in the JWT access token"
              fullWidth
            />
          </InputWithIcon>
          <InputWithIcon icon={<LabelIcon />}>
            <TextField
              id="issuerName"
              label="Name"
              variant="outlined"
              placeholder="Friendly display name..."
              value={issuer.modified.displayName || ""}
              onChange={handleNameChange}
              fullWidth
              autoFocus
            />
          </InputWithIcon>
          <InputWithIcon icon={<VpnKeyIcon />}>
            <FormControl fullWidth>
              <InputLabel htmlFor="publicKeyAcquisition">
                Public Key Acquisition
              </InputLabel>
              <Select
                id="publicKeyAcquisition"
                value={issuer.modified.publicKeyAcquisition}
                onChange={handlePublicKeyAcquisitionChange}
              >
                <MenuItem value={"pki"}>Stored Public Key</MenuItem>
                <MenuItem value={"jwks"}>JWKS Endpoint</MenuItem>
              </Select>
            </FormControl>
          </InputWithIcon>
          {issuer.modified.publicKeyAcquisition === "jwks" && (
            <InputWithIcon>
              <TextField
                id="jsonKeysUrl"
                label="JWKS URL"
                helperText={
                  isError()
                    ? issuer.modified.jsonKeysUrlError
                    : "The JWKS endpoint must be a secure https:// URL"
                }
                variant="outlined"
                value={issuer.modified.jsonKeysUrl || ""}
                onChange={handleJsonKeyUrlChange}
                error={isError()}
                fullWidth
              />
            </InputWithIcon>
          )}
          {issuer.modified.publicKeyAcquisition === "pki" && <PublicKeys />}
        </form>
      </Grid>
      <Grid item xs={4}>
        <InfoCard learnMoreUrl="https://fusebit.io/docs/integrator-guide/authz-model/#registering-an-issuer">
          Fusebit validates the signature of the access tokens created by this
          issuer using a public key. The public key can be stored in the system
          or retrieved automatically from a JWKS endpoint.
        </InfoCard>
      </Grid>
      {isDirty() && <ConfirmNavigation />}
      {isDirty() && <SaveFab onClick={handleSave} disabled={isError()} />}
    </Grid>
  );
}

export default IssuerOverview;
