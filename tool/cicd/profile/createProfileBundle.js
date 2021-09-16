#!/usr/bin/env -S node --no-warnings

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const homedir = require('os').homedir();

const userProfileRoot = `${homedir}/.fusebit`;
const userProfileNames = ['stage.us-west-2.internal', 'selfservice.api.us-west-1.internal'];
const opsProfileRoot = `${homedir}/.fusebit-ops`;
const opsProfileNames = ['github-automation.321', 'github-automation.749', 'github-automation.763'];

const renderUserProfile = () => {
  const settings = JSON.parse(fs.readFileSync(path.join(userProfileRoot, 'settings.json')));
  const profiles = {};
  const keys = {};
  for (const userProfileName of userProfileNames) {
    const kid = settings.profiles[userProfileName].kid;
    const privateKey = fs.readFileSync(path.join(userProfileRoot, 'keys', userProfileName, kid, 'pri')).toString();
    const publicKey = fs.readFileSync(path.join(userProfileRoot, 'keys', userProfileName, kid, 'pub')).toString();
    profiles[userProfileName] = settings.profiles[userProfileName];
    keys[path.join('keys', userProfileName, kid, 'pri')] = privateKey;
    keys[path.join('keys', userProfileName, kid, 'pub')] = publicKey;
  }

  const output = {
    settings: {
      profiles,
      defaults: { profile: userProfileNames[0] },
    },
    keys,
    profileName: userProfileNames[0],
  };

  return output;
};

const renderOpsProfile = () => {
  const settings = JSON.parse(fs.readFileSync(path.join(opsProfileRoot, 'settings.json')));
  const output = {
    settings: {
      profiles: {},
      defaults: { profile: opsProfileNames[0] },
    },
    profileName: opsProfileNames[0],
  };
  opsProfileNames.forEach((name) => {
    assert(settings.profiles[name], `missing profile ${name}`);
    output.settings.profiles[name] = settings.profiles[name];
  });
  return output;
};

const result = { user: renderUserProfile(), ops: renderOpsProfile() };
console.log(JSON.stringify(result));
