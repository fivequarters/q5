import ms from 'ms';

import { IExecuteInput, Confirm } from '@5qtrs/cli';
import { Text, IText } from '@5qtrs/text';
import {
  FusebitProfile,
  IFusebitExecutionProfile,
  IFusebitNewProfile,
  IOAuthFusebitProfile,
  IPKIFusebitProfile,
  IFusebitKeyPair,
  IFusebitProfile,
  IFusebitProfileSettings,
  FusebitProfileException,
  FusebitProfileExceptionCode,
} from '@5qtrs/fusebit-profile-sdk';
import { ExecuteService } from './ExecuteService';
import { request } from '@5qtrs/request';
const QR = require('qrcode-terminal');
import { decodeJwt } from '@5qtrs/jwt';
const OS = require('os');

// ------------------
// Internal Constants
// ------------------

const profileOptions = ['account', 'subscription', 'boundary', 'function'];
const notSet = Text.dim(Text.italic('<not set>'));
export const DEFAULT_TOKEN_EXPIRATION = '2h';
const DEFAULT_TOKEN_EXPIRATION_MS = ms('2h');

// -------------------
// Exported Interfaces
// -------------------

export interface IFusebitProfileDefaults {
  [index: string]: string | undefined;
  account?: string;
  subscription?: string;
  boundary?: string;
  function?: string;
}

// ----------------
// Exported Classes
// ----------------

export class ProfileService {
  private input: IExecuteInput;
  private profile: FusebitProfile;
  private executeService: ExecuteService;

  private constructor(profile: FusebitProfile, executeService: ExecuteService, input: IExecuteInput) {
    this.input = input;
    this.profile = profile;
    this.executeService = executeService;
  }

  public static async create(input: IExecuteInput) {
    const flexdProfile = await FusebitProfile.create();
    const executeService = await ExecuteService.create(input);
    return new ProfileService(flexdProfile, executeService, input);
  }

  public async listProfiles(): Promise<IFusebitProfile[]> {
    return this.execute(() => this.profile.listProfiles());
  }

  public async getProfileNameFromBaseUrl(baseUrl: string): Promise<string> {
    return this.execute(() => this.profile.getProfileNameFromBaseUrl(baseUrl));
  }

  public async getPublicKey(name: string): Promise<string> {
    return this.execute(() => this.profile.getPublicKey(name));
  }

  public async getProfile(name: string): Promise<IFusebitProfile | undefined> {
    return this.execute(() => this.profile.getProfile(name));
  }

  public async getProfileOrThrow(name: string): Promise<IFusebitProfile> {
    return this.execute(() => this.profile.getProfileOrThrow(name));
  }

  public async getDefaultProfileOrThrow(): Promise<IFusebitProfile> {
    return this.execute(() => this.profile.getProfileOrDefaultOrThrow());
  }

  public async getProfileOrDefaultOrThrow(name?: string): Promise<IFusebitProfile> {
    return this.execute(() => this.profile.getProfileOrDefaultOrThrow(name));
  }

  public async getDefaultProfileName(): Promise<string | undefined> {
    return this.execute(() => this.profile.getDefaultProfileName());
  }

  public async setDefaultProfileName(name: string): Promise<void> {
    await this.execute(() => this.profile.setDefaultProfileName(name));
    await this.executeService.message(
      'Profile set',
      Text.create("The '", Text.bold(name), "' profile was successfully set as the default profile")
    );
  }

  public async generateKeyPair(name: string): Promise<IFusebitKeyPair> {
    return this.execute(() => this.profile.generateKeyPair(name));
  }

  public async initProfile(name: string, newProfile: IFusebitNewProfile, keyPair: IFusebitKeyPair): Promise<void> {
    await this.execute(async () => {
      if (await this.profile.profileExists(name)) {
        await this.profile.removeProfile(name);
      }
      await this.profile.addPKIProfile(name, newProfile, keyPair);
    });
  }

  public async createProfile(name: string, newProfile: IFusebitProfileSettings): Promise<IOAuthFusebitProfile> {
    return this.execute(async () => {
      if (await this.profile.profileExists(name)) {
        await this.profile.removeProfile(name);
      }
      return this.profile.createProfile(name, newProfile);
    });
  }

  public async createDefaultProfile(name: string, defaultProfileId: string): Promise<IOAuthFusebitProfile> {
    return this.execute(async () => {
      if (await this.profile.profileExists(name)) {
        await this.profile.removeProfile(name);
      }
      let profile = await this.profile.createDefaultProfile(name, defaultProfileId);
      try {
        // Force the OAuth flow to determine the Fusebit account and subscription ID
        await this.getOAuthAccessToken(profile);
        profile = (this.getProfile(profile.name) as unknown) as IOAuthFusebitProfile;
      } catch (e) {
        await this.removeProfile(name || (await this.profile.getDefaultProfileName()) || defaultProfileId);
        throw e;
      }
      return profile;
    });
  }

  public async copyProfile(name: string, copyTo: string): Promise<IFusebitProfile> {
    const profile = await this.execute(() => this.profile.copyProfile(name, copyTo, true));
    await this.executeService.result(
      'Profile Copied',
      Text.create(
        "The '",
        Text.bold(name),
        "' profile was successfully copied to create the '",
        Text.bold(copyTo),
        "' profile"
      )
    );

    return profile;
  }

  public async importProfile(
    source: { profile: IFusebitProfile; pki: IFusebitKeyPair; type: string },
    copyTo: string
  ): Promise<IFusebitProfile> {
    const profile = await this.execute(() => this.profile.importProfile(source, copyTo));

    await this.executeService.result(
      'Profile Imported',
      Text.create("The '", Text.bold(copyTo), "' profile was successfully written")
    );

    return profile;
  }

  public async addProfile(name: string, copyFrom: string, profile: IFusebitProfileSettings): Promise<IFusebitProfile> {
    await this.execute(() => this.profile.copyProfile(copyFrom, name, true));
    const addedProfile = await this.execute(() => this.profile.updateProfile(name, profile));
    await this.executeService.result(
      'Profile Added',
      Text.create("The '", Text.bold(name), "' profile was successfully added")
    );

    return addedProfile;
  }

  public async updateProfile(
    name: string,
    profile: IFusebitProfileSettings,
    resultMessage?: { message: IText; header: IText }
  ): Promise<IFusebitProfile> {
    const updatedProfile = await this.execute(() => this.profile.updateProfile(name, profile));
    const message = resultMessage || {
      message: 'Profile Updated',
      header: Text.create("The '", Text.bold(name), "' profile was successfully updated"),
    };
    await this.executeService.result(message.message, message.header);

    return updatedProfile;
  }

  public async renameProfile(name: string, renameTo: string): Promise<IFusebitProfile> {
    const profile = await this.execute(() => this.profile.renameProfile(name, renameTo, true));
    await this.executeService.result(
      'Profile Renamed',
      Text.create("The '", Text.bold(name), "' profile was successfully renamed to '", Text.bold(renameTo), "'")
    );
    return profile;
  }

  public async removeProfile(name: string): Promise<void> {
    await this.execute(() => this.profile.removeProfile(name));
    await this.executeService.result(
      'Profile Removed',
      Text.create("The '", Text.bold(name), "' profile was successfully removed")
    );
  }

  public async confirmCopyProfile(name: string, copyTo: string, profile: IFusebitProfile): Promise<void> {
    if (!this.input.options.quiet) {
      const confirmPrompt = await Confirm.create({
        header: 'Overwrite?',
        message: Text.create(
          "The '",
          Text.bold(copyTo),
          "' profile already exists. Overwrite the existing profile shown below?"
        ),
        details: this.getProfileConfirmDetails(profile),
      });
      const confirmed = await confirmPrompt.prompt(this.input.io);
      if (!confirmed) {
        await this.executeService.warning(
          'Copy Canceled',
          Text.create("Copying the '", Text.bold(name), "' profile was canceled")
        );
        throw new Error('Copy Canceled');
      }
    }
  }

  public async confirmAddProfile(name: string, profile: IFusebitProfile): Promise<void> {
    if (!this.input.options.quiet) {
      const confirmPrompt = await Confirm.create({
        header: 'Overwrite?',
        message: Text.create(
          "The '",
          Text.bold(name),
          "' profile already exists. Overwrite the existing profile shown below?"
        ),
        details: this.getProfileConfirmDetails(profile),
      });
      const confirmed = await confirmPrompt.prompt(this.input.io);
      if (!confirmed) {
        await this.executeService.warning(
          'Add Canceled',
          Text.create("Adding the '", Text.bold(name), "' profile was canceled")
        );
        throw new Error('Add Canceled');
      }
    }
  }

  public async confirmCreateProfile(name: string, profile: IFusebitProfile): Promise<void> {
    if (!this.input.options.quiet) {
      const confirmPrompt = await Confirm.create({
        header: 'Overwrite?',
        message: Text.create(
          "The '",
          Text.bold(name),
          "' profile already exists. Overwrite the existing profile shown below?"
        ),
        details: this.getProfileConfirmDetails(profile),
      });
      const confirmed = await confirmPrompt.prompt(this.input.io);
      if (!confirmed) {
        await this.executeService.warning(
          'Create Canceled',
          Text.create("Creating the '", Text.bold(name), "' profile was canceled")
        );
        throw new Error('Create Canceled');
      }
    }
  }

  public async confirmInitProfile(name: string, profile: IFusebitProfile): Promise<void> {
    if (!this.input.options.quiet) {
      const confirmPrompt = await Confirm.create({
        header: 'Overwrite?',
        message: Text.create(
          "The '",
          Text.bold(name),
          "' profile already exists. Initialize and overwrite the existing profile shown below?"
        ),
        details: this.getProfileConfirmDetails(profile),
      });
      const confirmed = await confirmPrompt.prompt(this.input.io);
      if (!confirmed) {
        await this.executeService.warning(
          'Init Canceled',
          Text.create("Initializing the '", Text.bold(name), "' profile was canceled")
        );
        throw new Error('Init Canceled');
      }
    }
  }

  public async confirmUpdateProfile(profile: IFusebitProfile, settings: IFusebitProfileSettings): Promise<void> {
    if (!this.input.options.quiet) {
      const confirmPrompt = await Confirm.create({
        header: 'Update?',
        message: Text.create("Update the '", Text.bold(profile.name), "' profile as shown below?"),
        details: this.getProfileUpdateConfirmDetails(profile, settings),
      });
      const confirmed = await confirmPrompt.prompt(this.input.io);
      if (!confirmed) {
        await this.executeService.warning(
          'Update Canceled',
          Text.create("Updating the '", Text.bold(profile.name), "' profile was canceled")
        );
        throw new Error('Update Canceled');
      }
    }
  }

  public async confirmRenameProfile(source: string, target: string, profile: IFusebitProfile): Promise<void> {
    if (!this.input.options.quiet) {
      const confirmPrompt = await Confirm.create({
        header: 'Overwrite?',
        message: Text.create(
          "The '",
          Text.bold(target),
          "' profile already exists. Overwrite the existing profile shown below?"
        ),
        details: this.getProfileConfirmDetails(profile),
      });
      const confirmed = await confirmPrompt.prompt(this.input.io);
      if (!confirmed) {
        await this.executeService.warning(
          'Rename Canceled',
          Text.create("Renaming the '", Text.bold(source), "' profile was canceled")
        );
        throw new Error('Rename Canceled');
      }
    }
  }

  public async confirmRemoveProfile(name: string, profile: IFusebitProfile): Promise<void> {
    if (!this.input.options.quiet) {
      const confirmPrompt = await Confirm.create({
        header: 'Remove?',
        message: Text.create("Remove the '", Text.bold(name), "' profile shown below?"),
        details: this.getProfileConfirmDetails(profile),
      });
      const confirmed = await confirmPrompt.prompt(this.input.io);
      if (!confirmed) {
        await this.executeService.warning(
          'Remove Canceled',
          Text.create("Removing the '", Text.bold(name), "' profile was canceled.")
        );
        throw new Error('Remove Canceled');
      }
    }
  }

  public async getExportProfileDemux(profileName?: string): Promise<any> {
    return this.execute(async () => {
      const profile = await this.profile.getProfileOrDefaultOrThrow(profileName);
      const profiles = this.profile.getTypedProfile(profile);
      if (profiles.pkiProfile) {
        return this.profile.getPKICredentials(profiles.pkiProfile as IPKIFusebitProfile);
      } else {
        return undefined;
      }
    });
  }

  private async getExecutionProfileDemux(
    profileName?: string,
    ignoreCache?: boolean,
    expiresIn?: number
  ): Promise<IFusebitExecutionProfile> {
    const profile = await this.profile.getProfileOrDefaultOrThrow(profileName);
    const profiles = this.profile.getTypedProfile(profile);
    if (profiles.pkiProfile) {
      return this.profile.getPKIExecutionProfile(profileName, ignoreCache, undefined, expiresIn);
    } else {
      if (expiresIn && expiresIn !== DEFAULT_TOKEN_EXPIRATION_MS) {
        throw new Error('Custom token expiration unsupported for OAuth profiles');
      }
      return this.getOAuthExecutionProfile(profiles.oauthProfile as IOAuthFusebitProfile, ignoreCache);
    }
  }

  private async getOAuthExecutionProfile(
    profile: IOAuthFusebitProfile,
    ignoreCache?: boolean
  ): Promise<IFusebitExecutionProfile> {
    let accessToken = ignoreCache ? undefined : await this.profile.getCachedAccessToken(profile);
    if (!accessToken) {
      const refreshToken = await this.profile.getCachedRefreshToken(profile);
      if (refreshToken) {
        try {
          accessToken = await this.refreshOAuthAccessToken(profile, refreshToken);
        } catch (e) {
          await this.executeService.warning(
            'Authentication',
            'Unable to refresh the access token using refresh token. Falling back to full re-authorization.'
          );
        }
      }
      if (!accessToken) {
        if (!this.isInteractive()) {
          throw new Error(
            'Unable to obtain OAuth access token because the command was launched in a non-interactive mode.'
          );
        }
        if (this.executeService) {
          accessToken = await this.getOAuthAccessToken(profile);
        }
      }
    }

    return {
      accessToken: accessToken as string,
      baseUrl: profile.baseUrl,
      account: process.env.FUSEBIT_ACCOUNT_ID || profile.account,
      subscription: profile.subscription || undefined,
      boundary: profile.boundary || undefined,
      function: profile.function || undefined,
    };
  }

  private isInteractive(): boolean {
    return this.input.options.output === 'pretty';
  }

  private async refreshOAuthAccessToken(profile: IOAuthFusebitProfile, refreshToken: string): Promise<string> {
    const refreshResponse = await request({
      method: 'POST',
      url: profile.tokenUrl,
      data: {
        client_id: profile.clientId,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      },
      headers: { 'Content-Type': 'application/json' },
    });

    if (refreshResponse.status === 200 && refreshResponse.data.access_token && refreshResponse.data.expires_in) {
      // Cache the token for later use

      await this.profile.setCachedAccessToken(
        profile,
        refreshResponse.data.access_token,
        new Date(Date.now() + refreshResponse.data.expires_in * 1000),
        refreshToken
      );

      return refreshResponse.data.access_token;
    }

    throw new Error(`Unable to refresh the access token. HTTP status code: ${refreshResponse.status}.`);
  }

  private async getOAuthAccessToken(profile: IOAuthFusebitProfile): Promise<string> {
    // Initiate device flow

    const oauthInitResponse = await this.executeService.executeSimpleRequest(
      {
        header: 'Login',
        message: Text.create(
          Text.bold('Please log in to Fusebit using the same account you used to sign up.'),
          Text.eol(),
          Text.eol(),
          'You can use your browser or mobile device'
        ),
        errorHeader: 'Login Error',
        errorMessage: Text.create("Unable to initiate authentication for '", Text.bold(profile.name), "' profile"),
      },
      {
        method: 'POST',
        url: profile.issuer,
        data: {
          client_id: profile.clientId,
          audience: profile.baseUrl,
          scope: 'offline_access',
        },
      }
    );

    if (oauthInitResponse.status !== 200) {
      throw new Error(
        `Unable to initiate OAuth device flow using ${profile.issuer} authorization endpoint and ${profile.clientId} client ID. HTTP status code: ${oauthInitResponse.status}.`
      );
    }

    let qrcode: string = '';
    QR.generate(
      oauthInitResponse.data.verification_uri_complete || oauthInitResponse.data.verification_uri,
      { small: true },
      (code: string) => (qrcode = code)
    );

    const details = [
      'Navigate to the following URL and then log in with your identity provider',
      Text.eol(),
      Text.eol(),
      Text.dim(`${oauthInitResponse.data.verification_uri}?user_code=${oauthInitResponse.data.user_code}`),
      Text.eol(),
      Text.eol(),
    ];

    const mobileDeviceDetails = [
      'Scan the following QR code with your mobile device camera and then log in with your identity provider',
      Text.eol(),
      Text.eol(),
      'Verification code: ',
      Text.dim(oauthInitResponse.data.user_code),
      Text.eol(),
      Text.eol(),
    ];

    await this.executeService.info('Using a Browser', Text.create(details));
    await this.executeService.info('Using a Mobile Device', Text.create(mobileDeviceDetails));
    console.log(qrcode);

    // Wait for user to complete the device flow login

    const endTime = (oauthInitResponse.data.expires_in || 900) * 1000 + Date.now();
    const interval = (oauthInitResponse.data.interval || 5) * 1000;

    this.input.io.spin(true);
    let payload: any;
    try {
      while (Date.now() < endTime) {
        await new Promise((resolve) => setTimeout(resolve, interval));
        const oauthPollResponse = await request({
          method: 'POST',
          url: profile.tokenUrl,
          data: {
            client_id: profile.clientId,
            device_code: oauthInitResponse.data.device_code,
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
          },
          headers: { 'Content-Type': 'application/json' },
        });
        if (oauthPollResponse.status === 200) {
          payload = oauthPollResponse.data;
          if (!payload.access_token || !payload.expires_in) {
            throw new Error('Invalid response from the authorization server.');
          }
          break;
        } else if (oauthPollResponse.status >= 400 && oauthPollResponse.status < 500) {
          if (oauthPollResponse.data) {
            if (oauthPollResponse.data.error === 'authorization_pending') {
              continue;
            }
            throw new Error(
              `Authentication unsuccessful: ${oauthPollResponse.data.error}. HTTP status code: ${oauthPollResponse.status}.`
            );
          }
        }
        throw new Error(`Authentication unsuccessful. HTTP status code: ${oauthPollResponse.status}.`);
      }
    } finally {
      this.input.io.spin(false);
    }

    // If the profile was created synthetically, save it to disk after adding
    // the Fusebit account and subscription IDs extracted from the access token.
    if (profile.synthetic) {
      const jwt = decodeJwt(payload.access_token);
      const { accountId, subscriptionId } = (jwt && jwt['https://fusebit.io/profile']) || {};
      if (!accountId) {
        throw new Error(`Unable to determine the Fusebit account ID based on the obtained access token.`);
      }
      delete profile.synthetic;
      profile.account = accountId;
      if (subscriptionId) {
        profile.subscription = subscriptionId;
      }
      await this.updateProfile(profile.name, profile, {
        message: 'Success',
        header: Text.create(`You are now logged in. Profile '${profile.name}' created`),
      });
    }

    // Cache the token for later use

    await this.profile.setCachedAccessToken(
      profile,
      payload.access_token,
      new Date(Date.now() + payload.expires_in * 1000),
      payload.refresh_token
    );

    return payload.access_token;
  }

  public async getExecutionProfile(
    expected?: string[],
    defaults?: IFusebitProfileDefaults
  ): Promise<IFusebitExecutionProfile> {
    const profileName = this.input.options.profile as string;
    const profile = await this.execute(() => this.getExecutionProfileDemux(profileName));

    for (const option of profileOptions) {
      if (this.input.options[option]) {
        profile[option] = this.input.options[option] as string;
      } else if (defaults && defaults[option]) {
        profile[option] = defaults[option];
      }
    }

    for (const expect of expected || []) {
      if (profile[expect] === undefined) {
        await this.executeService.error(
          'Input Required',
          Text.create("The '", Text.bold(expect), "' input must be specified as it is not specified in the profile.")
        );
      }
    }

    return profile;
  }

  public async displayProfiles(profiles: IFusebitProfile[]) {
    if (this.input.options.output === 'json') {
      await this.input.io.writeLine(JSON.stringify(profiles, null, 2));
      return;
    }

    this.executeService.message(Text.cyan('Profiles'), Text.cyan('Details'));
    const defaultProfileName = await this.profile.getDefaultProfileName();

    for (const profile of profiles) {
      await this.writeProfile(profile, profile.name === defaultProfileName);
    }
  }

  public async displayProfile(profile: IFusebitProfile, agentDetails?: IText) {
    if (this.input.options.output === 'json') {
      await this.input.io.writeLine(JSON.stringify(profile, null, 2));
      return;
    }

    const defaultProfileName = await this.profile.getDefaultProfileName();

    await this.writeProfile(profile, profile.name === defaultProfileName, agentDetails);
  }

  public async displayPrettyProfile(profile: IFusebitProfile) {
    if (this.input.options.output === 'json') {
      await this.input.io.writeLine(JSON.stringify(profile, null, 2));
      return;
    }

    await this.executeService.message(profile.name, 'Successfully created!');
  }

  public async displayTokenContext(
    profileName?: string,
    expiresIn: number = DEFAULT_TOKEN_EXPIRATION_MS
  ): Promise<void> {
    if (!profileName) {
      profileName = await this.profile.getDefaultProfileName();
    }

    const output = this.input.options.output;

    // Get execution profile to ensure OAuth flow was executed at least once
    const profile = await this.execute(() => this.getExecutionProfileDemux(profileName, true, expiresIn));
    profile.expiresAt = new Date(Date.now() + expiresIn).toUTCString();

    if (output === 'base64') {
      await this.input.io.writeLineRaw(Buffer.from(JSON.stringify(profile), 'utf8').toString('base64'));
      return;
    }

    if (output === 'json') {
      await this.input.io.writeLineRaw(JSON.stringify(profile, null, 2));
      return;
    }

    if (output === 'raw') {
      await this.input.io.writeLineRaw(profile.accessToken);
      return;
    }

    const details = [
      Text.dim('Deployment: '),
      profile.baseUrl,
      Text.eol(),
      Text.dim('Account: '),
      profile.account || notSet,
      Text.eol(),
      Text.dim('Access Token: '),
    ];

    await this.executeService.info(profileName as string, Text.create(details));

    this.input.io.writeLineRaw(profile.accessToken);
    this.input.io.writeLine();
  }

  public async getNamedExecutionProfile(profileName: string): Promise<IFusebitExecutionProfile> {
    const profile = await this.execute(() => this.getExecutionProfileDemux(profileName));
    return profile;
  }

  public async getAgent(profileName: string): Promise<any> {
    const profile = await this.execute(() => this.getExecutionProfileDemux(profileName));

    const agent = await this.executeService.executeRequest(
      {
        header: 'Get Profile Details',
        message: Text.create("Getting the details of the '", Text.bold(profileName), "' profile..."),
        errorHeader: 'Get Profile Details Error',
        errorMessage: Text.create("Unable to get the details of the '", Text.bold(profileName), "' profile"),
      },
      {
        method: 'GET',
        url: `${profile.baseUrl}/v1/account/${profile.account}/me`,
        headers: { Authorization: `bearer ${profile.accessToken}` },
      }
    );

    return agent;
  }

  private getProfileUpdateConfirmDetails(profile: IFusebitProfile, settings: IFusebitProfileSettings) {
    const subscription = profile.subscription || notSet;
    const boundary = profile.boundary || notSet;
    const func = profile.function || notSet;

    const newSubscription = settings.subscription || notSet;
    const newBoundary = settings.boundary || notSet;
    const newFunction = settings.function || notSet;

    const subscriptionValue =
      subscription === newSubscription
        ? Text.create(subscription, Text.dim(' (no change)'))
        : Text.create(subscription, Text.dim(' → '), newSubscription);
    const boundaryValue =
      boundary === newBoundary
        ? Text.create(boundary, Text.dim(' (no change)'))
        : Text.create(boundary, Text.dim(' → '), newBoundary);
    const functionValue =
      func === newFunction
        ? Text.create(func, Text.dim(' (no change)'))
        : Text.create(func, Text.dim(' → '), newFunction);

    return [
      { name: 'Deployment', value: profile.baseUrl },
      { name: 'Account', value: profile.account },
      { name: 'Subscription', value: subscriptionValue },
      { name: 'Boundary', value: boundaryValue },
      { name: 'Function', value: functionValue },
    ];
  }

  public async execute<T>(func: () => Promise<T>) {
    try {
      const result = await func();
      return result;
    } catch (error) {
      if (error instanceof FusebitProfileException) {
        await this.writeFusebitProfileErrorMessage(error);
      } else {
        await this.writeErrorMessage(error);
      }
      throw error;
    }
  }

  // Removes any half-complete profile created during the initial OAuth flow
  public async removeUncompletedProfiles(): Promise<void> {
    const profiles = await this.execute(() => this.profile.listProfiles());
    const uncompletedProfiles = profiles.filter((profile) => !profile.account);
    for (const profile of uncompletedProfiles) {
      await this.profile.removeProfile(profile.name);
    }
  }

  private async writeFusebitProfileErrorMessage(exception: FusebitProfileException) {
    switch (exception.code) {
      case FusebitProfileExceptionCode.profileDoesNotExist:
        await this.executeService.error(
          'No Profile',
          Text.create("The profile '", Text.bold(exception.params[0]), "' does not exist"),
          exception
        );
        return;
      case FusebitProfileExceptionCode.profileAlreadyExists:
        await this.executeService.error(
          'Profile Exists',
          Text.create("The profile '", Text.bold(exception.params[0]), "' already exists"),
          exception
        );
        return;
      case FusebitProfileExceptionCode.baseUrlMissingProtocol:
        await this.executeService.error(
          'Base Url',
          Text.create(
            "The base url '",
            Text.bold(exception.params[0]),
            "' does not include the protocol, 'http' or 'https'"
          ),
          exception
        );
        return;
      case FusebitProfileExceptionCode.noDefaultProfile:
        await this.executeService.error('No Profile', 'There is no default profile set', exception);
        return;
      default:
        await this.executeService.error('Profile Error', exception.message, exception);
        return;
    }
  }

  private async writeErrorMessage(error: Error) {
    await this.executeService.error('Profile Error', error.message, error);
  }

  private getProfileConfirmDetails(profile: IFusebitProfile) {
    const isOAuth = profile.clientId && profile.tokenUrl;
    let details = [
      { name: 'Type', value: isOAuth ? 'OAuth' : 'PKI' },
      { name: 'Deployment', value: profile.baseUrl },
      { name: 'Account', value: profile.account || notSet },
      { name: 'Subscription', value: profile.subscription || notSet },
      { name: 'Boundary', value: profile.boundary || notSet },
      { name: 'Function', value: profile.function || notSet },
      { name: isOAuth ? 'OAuth Device URL' : 'Issuer', value: profile.issuer },
    ];
    if (isOAuth) {
      details.push({ name: 'OAuth Token URL', value: profile.tokenUrl || notSet });
      details.push({ name: 'OAuth Client ID', value: profile.clientId || notSet });
    }

    return details;
  }

  private async writeProfile(profile: IFusebitProfile, isDefault: boolean, agentDetails?: IText) {
    const isOAuth = profile.clientId && profile.tokenUrl;
    const details = [
      Text.dim('Type: '),
      isOAuth ? 'OAuth' : 'PKI',
      Text.eol(),
      Text.dim('Deployment: '),
      profile.baseUrl,
      Text.eol(),
      Text.dim('Account: '),
      profile.account || notSet,
      Text.eol(),
    ];

    if (profile.subscription) {
      details.push(Text.dim('Subscription: '));
      details.push(profile.subscription);
      details.push(Text.eol());
    }

    if (profile.boundary) {
      details.push(Text.dim('Boundary: '));
      details.push(profile.boundary);
      details.push(Text.eol());
    }
    if (profile.function) {
      details.push(Text.dim('Function: '));
      details.push(profile.function);
      details.push(Text.eol());
    }
    details.push(Text.dim(isOAuth ? 'OAuth Device URL: ' : 'Issuer: '));
    details.push(profile.issuer);
    details.push(Text.eol());

    if (agentDetails) {
      if (profile.clientId && profile.tokenUrl) {
        // OAuth
        details.push(
          ...[
            Text.dim('OAuth Token URL: '),
            profile.tokenUrl,
            Text.eol(),
            Text.dim('OAuth Client ID: '),
            profile.clientId,
            Text.eol(),
          ]
        );
      } else {
        // PKI
        details.push(...[Text.dim('Subject: '), profile.subject as string, Text.eol()]);
      }
    }

    details.push(
      ...[Text.dim('Created: '), profile.created, Text.dim(' • '), Text.dim('Last Updated: '), profile.updated]
    );

    if (agentDetails) {
      details.push(Text.eol());
      details.push(Text.eol());
      details.push(agentDetails);
    }

    const name = isDefault
      ? Text.create(Text.bold(profile.name || 'NA'), Text.eol(), Text.dim(Text.italic('<default>')))
      : Text.bold(profile.name || 'NA');

    await this.executeService.message(name, Text.create(details));
  }

  public async fetchProvisionToken(url: string): Promise<string> {
    let username;
    try {
      username = OS.userInfo().username;
    } catch (_) {}
    const response = await request({
      method: 'POST',
      url,
      data: {
        firstName: username || undefined,
        accountDisplayName: username && `EveryAuth account for ${username}`,
        primaryEmail: this.input.options.email,
      },
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.status === 200 && response.data.initToken) {
      return response.data.initToken;
    }

    if (response.status === 429) {
      return new Promise((resolve) => setTimeout(async () => resolve(await this.fetchProvisionToken(url)), 1000));
    }

    if (this.input.options.verbose) {
      console.log('ERROR RESPONSE FROM THE FUSEBIT PROVISIONING API: HTTP', response.status, response.data);
    }

    throw new Error('Invalid service response');
  }
}
