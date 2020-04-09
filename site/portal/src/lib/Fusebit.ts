import { IFusebitProfile, IFusebitAuth, isIFusebitAuth } from "./Settings";
import {
  Client,
  User,
  Issuer,
  Subscription,
  BoundaryHash,
  FunctionSpecification,
  ExistingFunctionSpecification
} from "./FusebitTypes";

import Superagent from "superagent";
// import parseUrl from "url-parse";

export async function ensureAccessToken(
  profile: IFusebitProfile
): Promise<IFusebitAuth> {
  if (isIFusebitAuth(profile.auth)) {
    return profile.auth;
  } else {
    throw new Error("User not logged in");
  }
}

export function formatAgent(agent: any) {
  return `${[agent.firstName, agent.lastName, agent.displayName]
    .join(" ")
    .trim() || "N/A"} (${agent.id})`;
}

export function lastSegment(path: string) {
  let tokens = path.split("/");
  return tokens[tokens.length - 1];
}

function throwHttpException(error: any) {
  throw createHttpException(error);
}

export function createHttpException(error: any) {
  return (
    (error.response && error.response.body) || {
      message: error.message || "Unknown error"
    }
  );
}

export async function getMe(profile: IFusebitProfile) {
  try {
    let auth = await ensureAccessToken(profile);
    let result = await Superagent.get(
      `${profile.baseUrl}/v1/account/${profile.account}/me`
    ).set("Authorization", `Bearer ${auth.access_token}`);

    let account = result.body;
    let allow = (account && account.access && account.access.allow) || [];
    account.can = {
      audit: { get: false },
      user: {
        add: false,
        get: false,
        update: false,
        delete: false,
        init: false
      },
      client: {
        add: false,
        get: false,
        update: false,
        delete: false,
        init: false
      },
      issuer: { add: false, get: false, update: false, delete: false }
    };
    for (let i = 0; i < allow.length; i++) {
      let acl = allow[i];
      // eslint-disable-next-line
      for (let resourceType of ["audit", "user", "client", "issuer"]) {
        // eslint-disable-next-line
        for (let operation of ["get", "add", "update", "delete", "init"]) {
          if (acl.action === `${resourceType}:${operation}`) {
            account.can[resourceType][operation] = true;
          }
        }
        if (acl.action === `${resourceType}:*` || acl.action === "*") {
          Object.keys(account.can[resourceType]).forEach(
            operation => (account.can[resourceType][operation] = true)
          );
        }
      }
    }

    return account;
  } catch (e) {
    throwHttpException(e);
  }
}
/*
export async function getAccount(profile) {
  try {
    await ensureAccessToken(profile);
    let result = await Superagent.get(
      `${profile.fusebitUrl}/v1/account/${profile.accountId}`
    ).set("Authorization", `Bearer ${profile.auth.access_token}`);
    return result.body;
  } catch (e) {
    throwHttpException(e);
  }
}

export async function tryGetUserByIdentity(profile, issuerId, subject) {
  try {
    await ensureAccessToken(profile);
    let result = await Superagent.get(
      `${profile.fusebitUrl}/v1/account/${
        profile.accountId
      }/user?issuerId=${encodeURIComponent(
        issuerId
      )}&subject=${encodeURIComponent(subject)}`
    ).set("Authorization", `Bearer ${profile.auth.access_token}`);
    return result.body.items.length === 0 ? undefined : result.body.items[0];
  } catch (e) {
    throwHttpException(e);
  }
}

export async function tryGetClientByIdentity(profile, issuerId, subject) {
  try {
    await ensureAccessToken(profile);
    let result = await Superagent.get(
      `${profile.fusebitUrl}/v1/account/${
        profile.accountId
      }/client?issuerId=${encodeURIComponent(
        issuerId
      )}&subject=${encodeURIComponent(subject)}`
    ).set("Authorization", `Bearer ${profile.auth.access_token}`);
    return result.body.items.length === 0 ? undefined : result.body.items[0];
  } catch (e) {
    throwHttpException(e);
  }
}
*/

export async function getSubscriptions(
  profile: IFusebitProfile
): Promise<Subscription[]> {
  let subscriptions: any[] = [];
  try {
    let auth = await ensureAccessToken(profile);
    let next;
    do {
      let result: any = await Superagent.get(
        `${profile.baseUrl}/v1/account/${profile.account}/subscription${next ||
          ""}`
      ).set("Authorization", `Bearer ${auth.access_token}`);
      subscriptions = subscriptions.concat(result.body.items);
      next = result.body.next ? `?next=${result.body.next}` : undefined;
    } while (next);
  } catch (e) {
    throw createHttpException(e);
  }
  return subscriptions as Subscription[];
}

export async function getUsers(profile: IFusebitProfile): Promise<User[]> {
  let users: any[] = [];
  try {
    let auth = await ensureAccessToken(profile);
    let next;
    do {
      let result: any = await Superagent.get(
        `${profile.baseUrl}/v1/account/${
          profile.account
        }/user?include=all${next || ""}`
      ).set("Authorization", `Bearer ${auth.access_token}`);
      users = users.concat(result.body.items);
      next = result.body.next ? `&next=${result.body.next}` : undefined;
    } while (next);
  } catch (e) {
    throw createHttpException(e);
  }
  return users as User[];
}

export async function getClient(
  profile: IFusebitProfile,
  clientId: string
): Promise<Client> {
  try {
    let auth = await ensureAccessToken(profile);
    let result: any = await Superagent.get(
      `${profile.baseUrl}/v1/account/${profile.account}/client/${clientId}`
    ).set("Authorization", `Bearer ${auth.access_token}`);
    return result.body as Client;
  } catch (e) {
    throw createHttpException(e);
  }
}

export async function getUser(
  profile: IFusebitProfile,
  userId: string
): Promise<User> {
  try {
    let auth = await ensureAccessToken(profile);
    let result: any = await Superagent.get(
      `${profile.baseUrl}/v1/account/${profile.account}/user/${userId}`
    ).set("Authorization", `Bearer ${auth.access_token}`);
    return result.body as User;
  } catch (e) {
    throw createHttpException(e);
  }
}

export async function initUser(
  profile: IFusebitProfile,
  initToken: string
): Promise<any> {
  try {
    let auth = await ensureAccessToken(profile);
    let result: any = await Superagent.post(
      `${profile.baseUrl}/v1/account/${profile.account}/init`
    )
      .set("Authorization", `Bearer ${initToken}`)
      .send({
        protocol: "oauth",
        accessToken: auth.access_token
      });
    return result.body;
  } catch (e) {
    throwHttpException(e);
  }
}

export async function getInitToken(
  profile: IFusebitProfile,
  agentId: string,
  protocol: "pki" | "oauth",
  isUser: boolean
): Promise<any> {
  let profileData: any = {
    id: profile.id,
    displayName: profile.displayName,
    subscription: profile.subscription,
    boundary: profile.boundary,
    function: profile.function,
    oauth: protocol === "oauth" ? profile.oauth : undefined
  };
  try {
    let auth = await ensureAccessToken(profile);
    let result: any = await Superagent.post(
      isUser
        ? `${profile.baseUrl}/v1/account/${profile.account}/user/${agentId}/init`
        : `${profile.baseUrl}/v1/account/${profile.account}/client/${agentId}/init`
    )
      .set("Authorization", `Bearer ${auth.access_token}`)
      .send({
        protocol,
        profile: profileData
      });
    return result.body;
  } catch (e) {
    throwHttpException(e);
  }
}

export async function updateUser(
  profile: IFusebitProfile,
  user: any
): Promise<User> {
  try {
    let auth = await ensureAccessToken(profile);
    let result: any = await Superagent.patch(
      `${profile.baseUrl}/v1/account/${profile.account}/user/${user.id}`
    )
      .set("Authorization", `Bearer ${auth.access_token}`)
      .send({
        firstName: user.firstName,
        lastName: user.lastName,
        primaryEmail: user.primaryEmail,
        identities: user.identities,
        access: user.access
      });
    return result.body as User;
  } catch (e) {
    throw createHttpException(e);
  }
}

export async function newUser(
  profile: IFusebitProfile,
  user: any
): Promise<User> {
  try {
    let auth = await ensureAccessToken(profile);
    let result: any = await Superagent.post(
      `${profile.baseUrl}/v1/account/${profile.account}/user`
    )
      .set("Authorization", `Bearer ${auth.access_token}`)
      .send({
        firstName: user.firstName,
        lastName: user.lastName,
        primaryEmail: user.primaryEmail,
        identities: user.identities,
        access: user.access
      });
    return result.body as User;
  } catch (e) {
    throw createHttpException(e);
  }
}

export async function updateClient(
  profile: IFusebitProfile,
  client: any
): Promise<Client> {
  try {
    let auth = await ensureAccessToken(profile);
    let result: any = await Superagent.patch(
      `${profile.baseUrl}/v1/account/${profile.account}/client/${client.id}`
    )
      .set("Authorization", `Bearer ${auth.access_token}`)
      .send({
        displayName: client.displayName,
        identities: client.identities,
        access: client.access
      });
    return result.body as Client;
  } catch (e) {
    throw createHttpException(e);
  }
}

export async function newClient(
  profile: IFusebitProfile,
  client: any
): Promise<Client> {
  try {
    let auth = await ensureAccessToken(profile);
    let result: any = await Superagent.post(
      `${profile.baseUrl}/v1/account/${profile.account}/client`
    )
      .set("Authorization", `Bearer ${auth.access_token}`)
      .send({
        displayName: client.displayName,
        identities: client.identities,
        access: client.access
      });
    return result.body as Client;
  } catch (e) {
    throw createHttpException(e);
  }
}

export function normalizeIssuer(issuer: any): Issuer {
  let normalized: any = {
    id: issuer.id
  };
  if (issuer.displayName !== undefined) {
    normalized.displayName = issuer.displayName.trim();
  }
  if (issuer.publicKeyAcquisition !== undefined) {
    normalized.publicKeyAcquisition = issuer.publicKeyAcquisition;
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
  return normalized as Issuer;
}

export function normalizeAgent(user: any): Client | User {
  let normalized: any = {
    id: user.id
  };
  ["firstName", "lastName", "primaryEmail", "displayName"].forEach(p => {
    if (user[p] && user[p].trim().length > 0) {
      normalized[p] = user[p].trim();
    }
  });
  if (user.identities && user.identities.length > 0) {
    normalized.identities = user.identities.sort((a: any, b: any) =>
      a.issuerId > b.issuerId
        ? -1
        : a.issuerId < b.issuerId
        ? 1
        : a.subject > b.subject
        ? -1
        : a.subject < b.subject
        ? 1
        : 0
    );
  } else {
    normalized.identities = [];
  }
  if (user.access && user.access.allow && user.access.allow.length > 0) {
    normalized.access = {
      allow: user.access.allow.sort((a: any, b: any) =>
        a.resource > b.resource
          ? -1
          : a.resource < b.resource
          ? 1
          : a.action > b.action
          ? -1
          : a.action < b.action
          ? 1
          : 0
      )
    };
  } else {
    normalized.access = { allow: [] };
  }
  return normalized as Client | User;
}

export async function getIssuers(profile: IFusebitProfile): Promise<Issuer[]> {
  let issuers: any[] = [];
  try {
    let auth = await ensureAccessToken(profile);
    let next;
    do {
      let result: any = await Superagent.get(
        `${profile.baseUrl}/v1/account/${profile.account}/issuer${next || ""}`
      ).set("Authorization", `Bearer ${auth.access_token}`);
      issuers = issuers.concat(result.body.items);
      next = result.body.next ? `?next=${result.body.next}` : undefined;
    } while (next);
  } catch (e) {
    throw createHttpException(e);
  }
  return issuers as Issuer[];
}

function computePublicKeyAcquisition(issuer: Issuer) {
  issuer.publicKeyAcquisition = issuer.jsonKeysUrl ? "jwks" : "pki";
}

export async function getIssuer(
  profile: IFusebitProfile,
  issuerId: string
): Promise<Issuer> {
  try {
    let auth = await ensureAccessToken(profile);
    let result: any = await Superagent.get(
      `${profile.baseUrl}/v1/account/${
        profile.account
      }/issuer/${encodeURIComponent(issuerId)}`
    ).set("Authorization", `Bearer ${auth.access_token}`);
    let newIssuer = result.body as Issuer;
    computePublicKeyAcquisition(newIssuer);
    return newIssuer;
  } catch (e) {
    throw createHttpException(e);
  }
}

export async function updateIssuer(
  profile: IFusebitProfile,
  issuer: any
): Promise<Issuer> {
  try {
    let auth = await ensureAccessToken(profile);
    let result: any = await Superagent.patch(
      `${profile.baseUrl}/v1/account/${
        profile.account
      }/issuer/${encodeURIComponent(issuer.id)}`
    )
      .set("Authorization", `Bearer ${auth.access_token}`)
      .send({
        displayName: issuer.displayName,
        publicKeys: issuer.publicKeys,
        jsonKeysUrl: issuer.jsonKeysUrl
      });
    let newIssuer = result.body as Issuer;
    computePublicKeyAcquisition(newIssuer);
    return newIssuer;
  } catch (e) {
    throw createHttpException(e);
  }
}

export async function newIssuer(
  profile: IFusebitProfile,
  issuer: any
): Promise<Issuer> {
  try {
    let auth = await ensureAccessToken(profile);
    let result: any = await Superagent.post(
      `${profile.baseUrl}/v1/account/${
        profile.account
      }/issuer/${encodeURIComponent(issuer.id)}`
    )
      .set("Authorization", `Bearer ${auth.access_token}`)
      .send({
        displayName: issuer.displayName,
        publicKeys: issuer.publicKeys,
        jsonKeysUrl: issuer.jsonKeysUrl
      });
    let newIssuer = result.body as Issuer;
    computePublicKeyAcquisition(newIssuer);
    return newIssuer;
  } catch (e) {
    throw createHttpException(e);
  }
}

export async function deleteUsers(
  profile: IFusebitProfile,
  userIds: string[]
): Promise<void> {
  try {
    let auth = await ensureAccessToken(profile);
    await Promise.all(
      userIds.map((id: string) =>
        Superagent.delete(
          `${profile.baseUrl}/v1/account/${profile.account}/user/${id}`
        )
          .set("Authorization", `Bearer ${auth.access_token}`)
          .ok(res => res.status === 204)
      )
    );
  } catch (e) {
    throwHttpException(e);
  }
}

export async function deleteIssuers(
  profile: IFusebitProfile,
  issuerIds: string[]
): Promise<void> {
  try {
    let auth = await ensureAccessToken(profile);
    await Promise.all(
      issuerIds.map((id: string) =>
        Superagent.delete(
          `${profile.baseUrl}/v1/account/${
            profile.account
          }/issuer/${encodeURIComponent(id)}`
        )
          .set("Authorization", `Bearer ${auth.access_token}`)
          .ok(res => res.status === 204)
      )
    );
  } catch (e) {
    throwHttpException(e);
  }
}

export async function getClients(profile: IFusebitProfile): Promise<Client[]> {
  let clients: any[] = [];
  try {
    let auth = await ensureAccessToken(profile);
    let next;
    do {
      let result: any = await Superagent.get(
        `${profile.baseUrl}/v1/account/${
          profile.account
        }/client?include=all${next || ""}`
      ).set("Authorization", `Bearer ${auth.access_token}`);
      clients = clients.concat(result.body.items);
      next = result.body.next ? `&next=${result.body.next}` : undefined;
    } while (next);
  } catch (e) {
    throw createHttpException(e);
  }
  return clients as Client[];
}

export async function deleteClients(
  profile: IFusebitProfile,
  clientIds: string[]
): Promise<void> {
  try {
    let auth = await ensureAccessToken(profile);
    await Promise.all(
      clientIds.map((id: string) =>
        Superagent.delete(
          `${profile.baseUrl}/v1/account/${profile.account}/client/${id}`
        )
          .set("Authorization", `Bearer ${auth.access_token}`)
          .ok(res => res.status === 204)
      )
    );
  } catch (e) {
    throwHttpException(e);
  }
}

export async function tryGetFunction(
  profile: IFusebitProfile,
  subscriptionId: string,
  boundaryId: string,
  functionId: string
) {
  try {
    let auth = await ensureAccessToken(profile);
    let response: any = await Superagent.get(
      `${profile.baseUrl}/v1/account/${profile.account}/subscription/${subscriptionId}/boundary/${boundaryId}/function/${functionId}`
    )
      .set("Authorization", `Bearer ${auth.access_token}`)
      .ok(res => res.status === 200 || res.status === 404);
    return response.status === 200
      ? (response.body as ExistingFunctionSpecification)
      : null;
  } catch (e) {
    throw createHttpException(e);
  }
}

export async function createFunction(
  profile: IFusebitProfile,
  subscriptionId: string,
  boundaryId: string,
  functionId: string,
  functionSpecification: FunctionSpecification
) {
  try {
    let auth = await ensureAccessToken(profile);
    let response: any = await Superagent.put(
      `${profile.baseUrl}/v1/account/${profile.account}/subscription/${subscriptionId}/boundary/${boundaryId}/function/${functionId}`
    )
      .set("Authorization", `Bearer ${auth.access_token}`)
      .send(functionSpecification);
    let attempts = 15;
    while (response.status === 201 && attempts > 0) {
      response = await Superagent.get(
        `${profile.baseUrl}/v1/account/${profile.account}/subscription/${subscriptionId}/boundary/${boundaryId}/function/${functionId}/build/${response.body.buildId}`
      ).set("Authorization", `Bearer ${auth.access_token}`);
      if (response.status === 200) {
        if (response.body.status === "success") {
          return;
        } else {
          throw new Error(
            `Failure creating function: ${(response.body.error &&
              response.body.error.message) ||
              "Unknown error"}`
          );
        }
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts--;
    }
    if (attempts === 0) {
      throw new Error(`Timeout creating function`);
    }
    if (
      response.status === 204 ||
      (response.body && response.body.status === "success")
    ) {
      return;
    } else {
      throw response.body;
    }
  } catch (e) {
    throw createHttpException(e);
  }
}

export async function getFunction(
  profile: IFusebitProfile,
  subscriptionId: string,
  boundaryId: string,
  functionId: string
) {
  try {
    let auth = await ensureAccessToken(profile);
    let response: any = await Superagent.get(
      `${profile.baseUrl}/v1/account/${profile.account}/subscription/${subscriptionId}/boundary/${boundaryId}/function/${functionId}`
    ).set("Authorization", `Bearer ${auth.access_token}`);
    return response.body as ExistingFunctionSpecification;
  } catch (e) {
    throw createHttpException(e);
  }
}

export function appendUrlSegment(url: string, segment: string) {
  return `${url}${url[url.length - 1] === "/" ? "" : "/"}${segment}`;
}

export async function deleteFunctions(
  profile: IFusebitProfile,
  subscriptionId: string,
  boundaryId: string,
  functionIds: string[]
): Promise<void> {
  try {
    let auth = await ensureAccessToken(profile);
    await Promise.all(
      functionIds.map((id: string) =>
        (async () => {
          const func = await getFunction(
            profile,
            subscriptionId,
            boundaryId,
            id
          );
          return func.metadata &&
            func.metadata.template &&
            func.metadata.template.managerUrl
            ? Superagent.post(
                appendUrlSegment(func.metadata.template.managerUrl, "uninstall")
              )
                .set("Authorization", `Bearer ${auth.access_token}`)
                .send({
                  baseUrl: profile.baseUrl,
                  accountId: profile.account,
                  subscriptionId,
                  boundaryId,
                  functionId: id
                })
            : Superagent.delete(
                `${profile.baseUrl}/v1/account/${profile.account}/subscription/${subscriptionId}/boundary/${boundaryId}/function/${id}`
              ).set("Authorization", `Bearer ${auth.access_token}`);
        })()
      )
    );
  } catch (e) {
    throw createHttpException(e);
  }
}

export async function getFunctions(
  profile: IFusebitProfile,
  subscriptionId: string,
  boundaryId?: string
): Promise<BoundaryHash> {
  let paths = computeFunctionScopes(profile, subscriptionId, boundaryId);
  try {
    let auth = await ensureAccessToken(profile);
    let boundaries: BoundaryHash = {};
    for (var i = 0; i < paths.length; i++) {
      let next;
      do {
        let response: any = await Superagent.get(
          `${profile.baseUrl}/v1${paths[i]}${next || ""}`
        ).set("Authorization", `Bearer ${auth.access_token}`);
        response.body.items.forEach((f: any) => {
          let boundary = (boundaries[f.boundaryId] = boundaries[
            f.boundaryId
          ] || { boundaryId: f.boundaryId, functions: [] });
          boundary.functions.push(f);
        });
        next = response.body.next ? `?next=${response.body.next}` : undefined;
      } while (next);
    }
    Object.keys(boundaries).forEach(boundaryId => {
      let boundary = boundaries[boundaryId];
      boundary.functions.sort((a: any, b: any) =>
        a.functionId < b.functionId ? -1 : a.functionId > b.functionId ? 1 : 0
      );
    });
    // if (boundaryId && !boundaries[boundaryId]) {
    //   boundaries[boundaryId] = { boundaryId, functions: [] };
    // }
    return boundaries;
  } catch (e) {
    throw createHttpException(e);
  }
}

/*
export async function getAudit(profile, filter) {
  if (!filter) {
    filter = {};
  }

  let resource = null;
  if (filter.subscriptionId) {
    resource = `/account/${profile.accountId}/subscription/${
      filter.subscriptionId
    }/`;
    if (filter.boundaryId) {
      resource += `boundary/${filter.boundaryId}/`;
      if (filter.functionId) {
        resource += `function/${filter.functionId}/`;
      }
    }
  }

  try {
    await ensureAccessToken(profile);
    let audit = [];
    let next;
    do {
      let url = parseUrl(
        `${profile.fusebitUrl}/v1/account/${profile.accountId}/audit`,
        true
      );
      ["action", "issuerId", "subject", "from", "to"].forEach(p => {
        if (filter[p] !== undefined) {
          url.query[p] = filter[p];
        }
      });
      if (next) url.query.next = next;
      if (resource) url.query.resource = resource;
      url.query.count = "100";
      let finalUrl = url.toString();
      let response = await Superagent.get(finalUrl).set(
        "Authorization",
        `Bearer ${profile.auth.access_token}`
      );
      audit = audit.concat(response.body.items);
      next = response.body.next;
    } while (next);
    audit.sort((a, b) =>
      a.timestamp < b.timstamp ? 1 : a.timestamp > b.timestamp ? -1 : 0
    );
    return audit;
  } catch (e) {
    throwHttpException(e);
  }
}
*/

export function computeFunctionScopes(
  profile: IFusebitProfile,
  subscriptionId: string,
  boundaryId?: string
) {
  let result = [];

  let account = profile.me;
  let allow = (account && account.access && account.access.allow) || [];
  for (let i = 0; i < allow.length; i++) {
    let acl = allow[i];
    if (
      acl.action === "function:*" ||
      acl.action === "function:get" ||
      acl.action === "*"
    ) {
      let [, , aid, , sid, , bid] = acl.resource.split("/");
      if ((aid && aid !== profile.account) || (sid && sid !== subscriptionId)) {
        continue;
      }
      if (!bid) {
        return [
          boundaryId
            ? `/account/${profile.account}/subscription/${subscriptionId}/boundary/${boundaryId}/function`
            : `/account/${profile.account}/subscription/${subscriptionId}/function`
        ];
      } else if (!boundaryId) {
        result.push(
          `/account/${profile.account}/subscription/${subscriptionId}/boundary/${bid}/function`
        );
      } else if (boundaryId === bid) {
        return [
          `/account/${profile.account}/subscription/${subscriptionId}/boundary/${boundaryId}/function`
        ];
      }
    }
  }
  return result;
}
