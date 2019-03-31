import { Message, IExecuteInput, Confirm, MessageKind } from '@5qtrs/cli';
import { ExecuteService } from './ExecuteService';
import { ProfileService } from './ProfileService';
import { Text } from '@5qtrs/text';
import { request } from '@5qtrs/request';
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

  public async listIssuers(): Promise<IFlexdIssuer[] | undefined> {
    const profile = await this.profileService.getExecutionProfile(['account']);
    if (!profile) {
      return undefined;
    }

    const added = await this.executeService.execute(
      {
        header: 'Get Issuers',
        message: Text.create("Getting the issuers of account '", Text.bold(profile.account || ''), "'..."),
        errorHeader: 'Get Issuer Error',
        errorMessage: Text.create("Unable to get the issuers of account '", Text.bold(profile.account || ''), "'"),
      },
      async () => {
        const result = await request({
          method: 'GET',
          url: `${profile.baseUrl}/account/${profile.account}/issuer`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `bearer ${profile.token}`,
          },
        });
        if (result.status === 404) {
          const message = 'Either the configured deployment URL is in correct, or the account does not exist';
          throw new Error(message);
        }
        if (result.status >= 500) {
          const message = 'An error occurred on the server.';
          throw new Error(message);
        }
        if (result.status !== 200) {
          const message = 'An unknown error occurred.';
          throw new Error(message);
        }
        return result.data.items;
      }
    );

    return added;
  }

  public async getIssuer(id: string): Promise<IFlexdIssuer | undefined> {
    const profile = await this.profileService.getExecutionProfile(['account']);
    if (!profile) {
      return undefined;
    }

    const added = await this.executeService.execute(
      {
        header: 'Get Issuer',
        message: Text.create("Getting issuer '", Text.bold(id), "'..."),
        errorHeader: 'Get Issuer Error',
        errorMessage: Text.create("Unable to get the issuer '", Text.bold(id), "'"),
      },
      async () => {
        const result = await request({
          method: 'GET',
          url: `${profile.baseUrl}/account/${profile.account}/issuer/${encodeURIComponent(id)}`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `bearer ${profile.token}`,
          },
        });
        if (result.status === 404) {
          const message =
            'Either the configured deployment URL is in correct, the account does not exist or the issuer does not exist';
          throw new Error(message);
        }
        if (result.status >= 500) {
          const message = 'An error occurred on the server.';
          throw new Error(message);
        }
        if (result.status !== 200) {
          const message = 'An unknown error occurred.';
          throw new Error(message);
        }
        return result.data;
      }
    );

    return added;
  }

  public async addIssuer(id: string, newIssuer: INewFlexdIssuer): Promise<IFlexdIssuer | undefined> {
    const profile = await this.profileService.getExecutionProfile(['account']);
    if (!profile) {
      return undefined;
    }

    const issuer = {
      displayName: newIssuer.displayName,
      jsonKeyUri: newIssuer.jsonKeyUri,
      publicKeys: newIssuer.publicKeyId ? [{ keyId: newIssuer.publicKeyId, publicKey: '<to replace>' }] : undefined,
    };

    if (newIssuer.publicKeyPath) {
      const publicKey = await this.executeService.execute(
        {
          errorHeader: 'Key File Error',
          errorMessage: Text.create("Unable to read the '", Text.bold(newIssuer.publicKeyPath), "' public key file"),
        },
        async () => readFile(newIssuer.publicKeyPath as string, { errorIfNotExist: true })
      );
      if (!publicKey) {
        return undefined;
      } else if (issuer.publicKeys) {
        issuer.publicKeys[0].publicKey = publicKey.toString();
      }
    }

    const added = await this.executeService.execute(
      {
        header: 'Add Issuer',
        message: Text.create("Adding the '", Text.bold(id), "' issuer..."),
        errorHeader: 'Add Issuer Error',
        errorMessage: Text.create("Unable to add the '", Text.bold(id), "' issuer"),
      },
      async () => {
        const result = await request({
          method: 'PUT',
          url: `${profile.baseUrl}/account/${profile.account}/issuer/${encodeURIComponent(id)}`,
          data: issuer,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `bearer ${profile.token}`,
          },
        });
        if (result.status === 404) {
          const message = 'Either the configured deployment URL is in correct, or the account does not exist.';
          throw new Error(message);
        }
        if (result.status >= 500) {
          const message = 'An error occurred on the server.';
          throw new Error(message);
        }
        if (result.status !== 200) {
          const message = 'An unknown error occurred.';
          throw new Error(message);
        }
        return result.data;
      }
    );

    return added;
  }

  public async confirmAddIssuer(id: string, newIssuer: INewFlexdIssuer): Promise<boolean> {
    const profile = await this.profileService.getExecutionProfile(['account']);
    if (!profile) {
      return false;
    }

    const confirmPrompt = await Confirm.create({
      header: 'Add Issuer?',
      message: Text.create("Add the '", Text.bold(id), "' issuer shown below?"),
      details: this.getIssuerConfirmDetails(id, profile.account as string, newIssuer),
    });
    const confirmed = await confirmPrompt.prompt(this.input.io);
    if (!confirmed) {
      await this.executeService.result({
        header: 'Add Issuer Canceled',
        message: Text.create("Adding the '", Text.bold(id), "' issuer was canceled."),
        kind: MessageKind.warning,
      });
    }
    return confirmed;
  }

  public async removeIssuer(id: string): Promise<boolean> {
    const profile = await this.profileService.getExecutionProfile(['account']);
    if (!profile) {
      return false;
    }

    const removedOk = await this.executeService.execute(
      {
        header: 'Remove Issuer',
        message: Text.create("Removing the '", Text.bold(id), "' issuer..."),
        errorHeader: 'Remove Issuer Error',
        errorMessage: Text.create("Unable to remove the '", Text.bold(id), "' issuer"),
      },
      async () => {
        const result = await request({
          method: 'DELETE',
          url: `${profile.baseUrl}/account/${profile.account}/issuer/${encodeURIComponent(id)}`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `bearer ${profile.token}`,
          },
        });
        if (result.status === 404) {
          const message =
            'Either the configured deployment URL is in correct, the account does not exist or the issuer does not exist.';
          throw new Error(message);
        }
        if (result.status >= 500) {
          const message = 'An error occurred on the server.';
          throw new Error(message);
        }
        if (result.status !== 204) {
          const message = 'An unknown error occurred.';
          throw new Error(message);
        }
        return true;
      }
    );

    return removedOk === true;
  }

  public async confirmRemoveIssuer(id: string, issuer: IFlexdIssuer): Promise<boolean> {
    const profile = await this.profileService.getExecutionProfile(['account']);
    if (!profile) {
      return false;
    }

    const confirmPrompt = await Confirm.create({
      header: 'Remove Issuer?',
      message: Text.create("Remove the '", Text.bold(id), "' issuer shown below?"),
      details: this.getIssuerConfirmDetails(id, profile.account as string, issuer),
    });
    const confirmed = await confirmPrompt.prompt(this.input.io);
    if (!confirmed) {
      await this.executeService.result({
        header: 'Remove Issuer Canceled',
        message: Text.create("Removing the '", Text.bold(id), "' issuer was canceled."),
        kind: MessageKind.warning,
      });
    }
    return confirmed;
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
}
