import { Message, IExecuteInput, Confirm, MessageKind } from '@5qtrs/cli';
import { ExecuteService } from './ExecuteService';
import { ProfileService } from './ProfileService';
import { Text } from '@5qtrs/text';
import { readFile } from '@5qtrs/file';

// ------------------
// Internal Constants
// ------------------

const notSet = Text.dim(Text.italic('<not set>'));

// -------------------
// Exported Interfaces
// -------------------

export interface IFlexdPublicKey {
  keyId: string;
  publicKey: string;
}

export interface INewFlexdIssuer {
  displayName?: string;
  jsonKeyUri?: string;
  publicKeyPath?: string;
  publicKeyId?: string;
}

export interface IFlexdIssuer {
  id: string;
  displayName?: string;
  jsonKeyUri?: string;
  publicKeys?: IFlexdPublicKey[];
}

// ----------------
// Exported Classes
// ----------------

export class IssuerService {
  private input: IExecuteInput;
  private executeService: ExecuteService;
  private profileService: ProfileService;

  private constructor(profileService: ProfileService, executeService: ExecuteService, input: IExecuteInput) {
    this.input = input;
    this.profileService = profileService;
    this.executeService = executeService;
  }

  public static async create(input: IExecuteInput) {
    const executeService = await ExecuteService.create(input);
    const profileService = await ProfileService.create(input);
    return new IssuerService(profileService, executeService, input);
  }

  public async listIssuers(): Promise<IFlexdIssuer[]> {
    const profile = await this.profileService.getExecutionProfile(['account']);

    const issuers = await this.executeService.executeRequest(
      {
        header: 'Get Issuers',
        message: Text.create("Getting the issuers of account '", Text.bold(profile.account || ''), "'..."),
        errorHeader: 'Get Issuer Error',
        errorMessage: Text.create("Unable to get the issuers of account '", Text.bold(profile.account || ''), "'"),
      },
      {
        method: 'GET',
        url: `${profile.baseUrl}/v1/account/${profile.account}/issuer`,
        headers: { Authorization: `bearer ${profile.accessToken}` },
      }
    );

    return issuers;
  }

  public async getIssuer(id: string): Promise<IFlexdIssuer> {
    const profile = await this.profileService.getExecutionProfile(['account']);

    const issuer = await this.executeService.executeRequest(
      {
        header: 'Get Issuer',
        message: Text.create("Getting issuer '", Text.bold(id), "'..."),
        errorHeader: 'Get Issuer Error',
        errorMessage: Text.create("Unable to get the issuer '", Text.bold(id), "'"),
      },
      {
        method: 'GET',
        url: `${profile.baseUrl}/v1/account/${profile.account}/issuer/${encodeURIComponent(id)}`,
        headers: { Authorization: `bearer ${profile.accessToken}` },
      }
    );

    return issuer;
  }

  public async addIssuer(id: string, newIssuer: INewFlexdIssuer): Promise<IFlexdIssuer> {
    const profile = await this.profileService.getExecutionProfile(['account']);

    let issuer;
    if (newIssuer.publicKeyPath) {
      const publicKey = await this.readPublicKeyFile(newIssuer.publicKeyPath);
      issuer = {
        displayName: newIssuer.displayName,
        publicKeys: [{ keyId: newIssuer.publicKeyId, publicKey }],
      };
    } else {
      issuer = {
        displayName: newIssuer.displayName,
        jsonKeyUri: newIssuer.jsonKeyUri,
      };
    }

    const addedIssuer = await this.executeService.executeRequest(
      {
        header: 'Add Issuer',
        message: Text.create("Adding the '", Text.bold(id), "' issuer..."),
        errorHeader: 'Add Issuer Error',
        errorMessage: Text.create("Unable to add the '", Text.bold(id), "' issuer"),
      },
      {
        method: 'PUT',
        url: `${profile.baseUrl}/v1/account/${profile.account}/issuer/${encodeURIComponent(id)}`,
        data: issuer,
        headers: { Authorization: `bearer ${profile.accessToken}` },
      }
    );

    await this.executeService.result(
      'Issuer Added',
      Text.create("The '", Text.bold(id), "' issuer was successfully added")
    );

    return addedIssuer;
  }

  public async removeIssuer(id: string): Promise<void> {
    const profile = await this.profileService.getExecutionProfile(['account']);

    await this.executeService.executeRequest(
      {
        header: 'Remove Issuer',
        message: Text.create("Removing the '", Text.bold(id), "' issuer..."),
        errorHeader: 'Remove Issuer Error',
        errorMessage: Text.create("Unable to remove the '", Text.bold(id), "' issuer"),
      },
      {
        method: 'DELETE',
        url: `${profile.baseUrl}/v1/account/${profile.account}/issuer/${encodeURIComponent(id)}`,
        headers: { Authorization: `bearer ${profile.accessToken}` },
      }
    );

    await this.executeService.result(
      'Issuer Removed',
      Text.create("The '", Text.bold(id), "' issuer was successfully remove")
    );
  }

  public async updateIssuer(id: string, issuer: INewFlexdIssuer): Promise<void> {
    const profile = await this.profileService.getExecutionProfile(['account']);

    await this.executeService.executeRequest(
      {
        header: 'Update Issuer',
        message: Text.create("Updating the '", Text.bold(id), "' issuer..."),
        errorHeader: 'Update Issuer Error',
        errorMessage: Text.create("Unable to update the '", Text.bold(id), "' issuer"),
      },
      {
        method: 'PUT',
        url: `${profile.baseUrl}/v1/account/${profile.account}/issuer/${encodeURIComponent(id)}`,
        data: issuer,
        headers: { Authorization: `bearer ${profile.accessToken}` },
      }
    );

    await this.executeService.result(
      'Issuer Updated',
      Text.create("The '", Text.bold(id), "' issuer was successfully updated")
    );
  }

  public async addPublicKey(id: string, issuer: INewFlexdIssuer): Promise<void> {
    const profile = await this.profileService.getExecutionProfile(['account']);

    await this.executeService.executeRequest(
      {
        header: 'Add Public Key',
        message: Text.create("Adding the public key to the '", Text.bold(id), "' issuer..."),
        errorHeader: 'Add Public Key Error',
        errorMessage: Text.create("Unable to add the public key to the '", Text.bold(id), "' issuer"),
      },
      {
        method: 'PUT',
        url: `${profile.baseUrl}/v1/account/${profile.account}/issuer/${encodeURIComponent(id)}`,
        data: issuer,
        headers: { Authorization: `bearer ${profile.accessToken}` },
      }
    );

    await this.executeService.result(
      'Public Key Added',
      Text.create("The public key was successfully added to the '", Text.bold(id), "' issuer")
    );
  }

  public async removePublicKey(id: string, issuer: INewFlexdIssuer): Promise<void> {
    const profile = await this.profileService.getExecutionProfile(['account']);

    await this.executeService.executeRequest(
      {
        header: 'Remove Public Key',
        message: Text.create("Removing the public key from the '", Text.bold(id), "' issuer..."),
        errorHeader: 'Remove Public Key Error',
        errorMessage: Text.create("Unable to remove the public key from the '", Text.bold(id), "' issuer"),
      },
      {
        method: 'PUT',
        url: `${profile.baseUrl}/v1/account/${profile.account}/issuer/${encodeURIComponent(id)}`,
        data: issuer,
        headers: { Authorization: `bearer ${profile.accessToken}` },
      }
    );

    await this.executeService.result(
      'Public Key Removed',
      Text.create("The public key was successfully removed from the '", Text.bold(id), "' issuer")
    );
  }

  public async confirmAddIssuer(id: string, newIssuer: INewFlexdIssuer): Promise<void> {
    const profile = await this.profileService.getExecutionProfile(['account']);

    const confirmPrompt = await Confirm.create({
      header: 'Add Issuer?',
      message: Text.create("Add the '", Text.bold(id), "' issuer shown below?"),
      details: this.getIssuerConfirmDetails(id, profile.account as string, newIssuer),
    });
    const confirmed = await confirmPrompt.prompt(this.input.io);
    if (!confirmed) {
      await this.executeService.message(
        'Add Issuer Canceled',
        Text.create("Adding the '", Text.bold(id), "' issuer was canceled."),
        MessageKind.warning
      );
      throw new Error('Add Issuer Canceled');
    }
  }

  public async confirmUpdateIssuer(issuer: IFlexdIssuer, newIssuer: INewFlexdIssuer): Promise<void> {
    const profile = await this.profileService.getExecutionProfile(['account']);

    const confirmPrompt = await Confirm.create({
      header: 'Update Issuer?',
      message: Text.create("Update the '", Text.bold(issuer.id), "' issuer shown below?"),
      details: this.getUpdateIssuerConfirmDetails(profile.account as string, issuer, newIssuer),
    });
    const confirmed = await confirmPrompt.prompt(this.input.io);
    if (!confirmed) {
      await this.executeService.message(
        'Update Issuer Canceled',
        Text.create("Updating the '", Text.bold(issuer.id), "' issuer was canceled."),
        MessageKind.warning
      );
      throw new Error('Update Issuer Canceled');
    }
  }

  public async confirmRemoveIssuer(id: string, issuer: IFlexdIssuer): Promise<void> {
    const profile = await this.profileService.getExecutionProfile(['account']);

    const confirmPrompt = await Confirm.create({
      header: 'Remove Issuer?',
      message: Text.create("Remove the '", Text.bold(id), "' issuer shown below?"),
      details: this.getIssuerConfirmDetails(id, profile.account as string, issuer),
    });
    const confirmed = await confirmPrompt.prompt(this.input.io);
    if (!confirmed) {
      await this.executeService.message(
        'Remove Issuer Canceled',
        Text.create("Removing the '", Text.bold(id), "' issuer was canceled."),
        MessageKind.warning
      );
      throw new Error('Remove Issuer Canceled');
    }
  }

  public async confirmAddPublicKey(issuer: IFlexdIssuer, keyId: string): Promise<void> {
    const profile = await this.profileService.getExecutionProfile(['account']);

    const confirmPrompt = await Confirm.create({
      header: 'Add Public Key?',
      message: Text.create("Add the public key to the '", Text.bold(issuer.id), "' issuer shown below?"),
      details: this.getPublicKeyConfirmDetails(issuer.id, profile.account as string, keyId),
    });
    const confirmed = await confirmPrompt.prompt(this.input.io);
    if (!confirmed) {
      await this.executeService.message(
        'Add Public Key Canceled',
        Text.create("Adding the public key to the '", Text.bold(issuer.id), "' issuer was canceled."),
        MessageKind.warning
      );
      throw new Error('Add Public Key Canceled');
    }
  }

  public async confirmRemovePublicKey(issuer: IFlexdIssuer, keyId: string): Promise<void> {
    const profile = await this.profileService.getExecutionProfile(['account']);

    const confirmPrompt = await Confirm.create({
      header: 'Remove Public Key?',
      message: Text.create("Remove the public key from the '", Text.bold(issuer.id), "' issuer shown below?"),
      details: this.getPublicKeyConfirmDetails(issuer.id, profile.account as string, keyId),
    });
    const confirmed = await confirmPrompt.prompt(this.input.io);
    if (!confirmed) {
      await this.executeService.message(
        'Remove Public Key Canceled',
        Text.create("Removing the public key from the '", Text.bold(issuer.id), "' issuer was canceled."),
        MessageKind.warning
      );
      throw new Error('Remove Public Key Canceled');
    }
  }

  public async displayIssuers(issuers: IFlexdIssuer[]) {
    if (this.input.options.format === 'json') {
      await this.input.io.writeLine(JSON.stringify(issuers, null, 2));
      return;
    }

    const message = await Message.create({
      header: Text.blue('Issuers'),
      message: Text.blue('Details'),
    });
    await message.write(this.input.io);

    for (const issuer of issuers) {
      await this.writeIssuer(issuer);
    }
  }

  public async displayIssuer(issuer: IFlexdIssuer) {
    if (this.input.options.format === 'json') {
      await this.input.io.writeLine(JSON.stringify(issuer, null, 2));
      return;
    }

    await this.writeIssuer(issuer);
  }

  private async writeIssuer(issuer: IFlexdIssuer) {
    const details = [Text.dim('Issuer: '), issuer.id || ''];

    if (!issuer.jsonKeyUri && !issuer.publicKeys) {
      details.push(Text.eol());
      details.push(Text.dim('[no key signature mechanism set]'));
    } else if (issuer.jsonKeyUri) {
      details.push(Text.eol());
      details.push(Text.dim('Json Key Uri: '));
      details.push(issuer.jsonKeyUri || '');
    } else if (issuer.publicKeys) {
      details.push(Text.eol());
      details.push(Text.dim('Public Key Ids: '));
      details.push(Text.join(issuer.publicKeys.map(key => key.keyId), Text.dim(' • ')));
    }

    let issuerCount = 1;
    const message = await Message.create({
      header: Text.bold(issuer.displayName || `Issuer ${issuerCount++}`),
      message: Text.create(details),
    });
    await message.write(this.input.io);
  }

  private getIssuerConfirmDetails(id: string, account: string, issuer: INewFlexdIssuer) {
    const details = [
      { name: 'Account', value: account },
      { name: 'Issuer', value: id },
      { name: 'Display Name', value: issuer.displayName || notSet },
    ];

    if (issuer.jsonKeyUri) {
      details.push({ name: 'Json Key Uri', value: issuer.jsonKeyUri });
    } else if (issuer.publicKeyId) {
      details.push({ name: 'Key Id', value: issuer.publicKeyId });
    }
    return details;
  }

  private getUpdateIssuerConfirmDetails(account: string, issuer: IFlexdIssuer, update: INewFlexdIssuer) {
    const displayName = issuer.displayName || notSet;
    const jsonKeyUri = issuer.jsonKeyUri || notSet;
    const publicKeys = issuer.publicKeys ? `${issuer.publicKeys.length} keys` : notSet;

    const newDisplayName = update.displayName || notSet;
    const newJsonKeyUri = update.jsonKeyUri || notSet;
    const newPublicKeys = newJsonKeyUri === notSet ? publicKeys : '0 Keys';

    const displayNameValue =
      displayName === newDisplayName
        ? Text.create(displayName, Text.dim(' (no change)'))
        : Text.create(displayName, Text.dim(' → '), displayName);
    const jsonKeyUriValue =
      jsonKeyUri === newJsonKeyUri
        ? Text.create(jsonKeyUri, Text.dim(' (no change)'))
        : Text.create(jsonKeyUri, Text.dim(' → '), newJsonKeyUri);
    const publicKeysValue =
      publicKeys === newPublicKeys
        ? Text.create(publicKeys, Text.dim(' (no change)'))
        : Text.create(publicKeys, Text.dim(' → '), newPublicKeys);

    const details = [
      { name: 'Account', value: account },
      { name: 'Issuer', value: issuer.id },
      { name: 'Display Name', value: displayNameValue },
      { name: 'Json Key URI', value: jsonKeyUriValue },
      { name: 'Public Keys', value: publicKeysValue },
    ];

    return details;
  }

  private getPublicKeyConfirmDetails(id: string, account: string, keyId: string) {
    const details = [
      { name: 'Account', value: account },
      { name: 'Issuer', value: id },
      { name: 'Key Id', value: keyId },
    ];
    return details;
  }

  private async readPublicKeyFile(path: string): Promise<string> {
    const buffer = await this.executeService.execute(
      {
        errorHeader: 'Key File Error',
        errorMessage: Text.create("Unable to read the '", Text.bold(path), "' public key file"),
      },
      async () => readFile(path as string, { errorIfNotExist: true })
    );
    return buffer.toString();
  }
}
