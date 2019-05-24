import {
  IAccountDataContext,
  IAccessEntry,
  IAgent,
  Resource,
  IIdentity,
  AccountDataException,
} from '@5qtrs/account-data';
import { decodeJwt, decodeJwtHeader, verifyJwt } from '@5qtrs/jwt';

// ------------------
// Internal Constants
// ------------------

const rootAgent = {
  id: 'root-user',
  identities: [{ issuerId: 'root', subject: 'root' }],
  access: {
    allow: [{ action: '*', resource: '/' }],
  },
};

// ------------------
// Internal Functions
// ------------------

async function resolveAgent(dataContext: IAccountDataContext, accountId: string, issuerId: string, subject: string) {
  return dataContext.agentData.get(accountId, { issuerId, subject });
}

async function validateJwt(dataContext: IAccountDataContext, accountId: string, jwt: string, issuerId: string) {
  const decodedJwtHeader = decodeJwtHeader(jwt);
  const kid = decodedJwtHeader.kid;
  const issuer = await dataContext.issuerData.get(accountId, issuerId);
  let secretOrUrl;
  if (issuer.jsonKeysUrl) {
    secretOrUrl = issuer.jsonKeysUrl;
  } else if (issuer.publicKeys) {
    for (const publicKey of issuer.publicKeys) {
      if (publicKey.keyId === kid) {
        secretOrUrl = publicKey.publicKey;
      }
    }
  }

  if (!secretOrUrl) {
    throw AccountDataException.noPublicKey(kid);
  }

  try {
    await verifyJwt(jwt, secretOrUrl);
  } catch (error) {
    throw AccountDataException.invalidJwt(error);
  }
}

function doesResouceAuthorize(grantedResource: string, requestedResource: string) {
  return requestedResource.indexOf(grantedResource) === 0;
}

function doesActionAuthorize(grantedAction: string, requestedAction: string) {
  const grantedSegments = grantedAction.split(':');
  const requestedSegments = requestedAction.split(':');
  if (grantedAction === requestedAction) {
    return true;
  }
  for (let i = 0; i < requestedSegments.length; i++) {
    if (grantedSegments[i]) {
      if (grantedSegments[i] === '*') {
        return true;
      } else if (grantedSegments[i] === requestedSegments[i]) {
        // ok, continue to check the next segment
      } else {
        return false;
      }
    } else {
      return false;
    }
  }
  return false;
}

function doesAccessEntryAuthorize(accessEntry: IAccessEntry, action: string, resource: string) {
  const actionAuth = doesActionAuthorize(accessEntry.action, action);
  const resourceAuth = doesResouceAuthorize(Resource.normalize(accessEntry.resource), resource);
  return actionAuth && resourceAuth;
}

// ----------------
// Exported Classes
// ----------------

export class ResolvedAgent implements IAgent {
  private dataContext: IAccountDataContext;
  private accountId: string;
  private agent: IAgent;
  private identity: IIdentity;

  private constructor(dataContext: IAccountDataContext, accountId: string, agent: IAgent, identity: IIdentity) {
    this.dataContext = dataContext;
    this.accountId = accountId;
    this.agent = agent;
    this.identity = identity;
  }

  public static async create(
    dataContext: IAccountDataContext,
    accountId: string,
    jwt: string,
    isRootAgent: boolean = false
  ) {
    if (isRootAgent) {
      accountId = accountId || 'root';
      return new ResolvedAgent(dataContext, accountId, rootAgent, rootAgent.identities[0]);
    }

    const decodedJwtPayload = decodeJwt(jwt);
    const issuerId = decodedJwtPayload.iss;
    const subject = decodedJwtPayload.sub;
    const identity = { issuerId, subject };

    const agentPromise = resolveAgent(dataContext, accountId, issuerId, subject);
    const validatePromise = validateJwt(dataContext, accountId, jwt, issuerId);

    await validatePromise;
    const agent = await agentPromise;
    return new ResolvedAgent(dataContext, accountId, agent, identity);
  }

  public isAuthorized(action: string, resource: string) {
    const accessEntries = this.agent.access && this.agent.access.allow ? this.agent.access.allow : [];

    resource = Resource.normalize(resource);
    for (const accessEntry of accessEntries) {
      if (doesAccessEntryAuthorize(accessEntry, action, resource)) {
        return true;
      }
    }
    return false;
  }

  public async ensureAuthorized(action: string, resource: string): Promise<void> {
    resource = Resource.normalize(resource);
    const authorized = this.isAuthorized(action, resource);
    await this.addAuditEntry(action, resource, authorized);
    if (!authorized) {
      throw AccountDataException.unauthorized(this.id as string, action, resource);
    }
  }

  public get id() {
    return this.agent.id;
  }

  public get identities() {
    const { issuerId, subject } = this.identity;
    return [{ issuerId, subject }];
  }

  public get access() {
    const accessEntries = this.agent.access && this.agent.access.allow ? this.agent.access.allow : [];
    const allow = accessEntries.map(accessEntry => {
      const { action, resource } = accessEntry;
      return { action, resource };
    });

    return { allow };
  }

  private async addAuditEntry(action: string, resource: string, authorized: boolean): Promise<void> {
    const auditEntry = {
      accountId: this.accountId,
      issuerId: this.identity.issuerId,
      subject: this.identity.subject,
      action,
      resource,
      authorized,
    };
    await this.dataContext.auditData.add(auditEntry);
  }
}
