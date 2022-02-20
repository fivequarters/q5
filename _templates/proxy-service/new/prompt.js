// prettier-ignore
const requireAllValues = (value) =>
  Object.entries(value).reduce((prev, entry) => prev || entry[1].length === 0, false)
    ? 'All fields must be supplied'
    : true;

// prettier-ignore
module.exports = [
  {
    type: 'input',
    name: 'name',
    message: 'Supply the name of the new service, for example "Slack", or "HubSpot".',
  },
  {
    type: 'form',
    name: 'connector',
    message: 'Specify the OAuth URLs used by the service',
    choices: [
      { name: 'tokenUrl', message: 'Token Exchange URL' },
      { name: 'authorizationUrl', message: 'Authorization URL' },
      { name: 'revokeUrl', message: 'Revocation URL' },
    ],
    validate: requireAllValues,
  },
].map((e) => ({ ...e, required: true }));
