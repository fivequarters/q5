/* tslint:disable no-namespace no-empty-interface max-classes-per-file */
import EntityBase from './EntityBase';
import superagent from 'superagent';

class Service extends EntityBase.ServiceDefault {
  public handleWebhookEvent = async (ctx: EntityBase.Types.Context, WebhookSigningSecret: string) => {
    const isChallenge = await this.InitializationChallenge(ctx);
    if (isChallenge) {
      ctx.status = 200;
      return;
    }

    const authId = await this.GetWebhookAuthId(ctx.req.body);
    if (!authId) {
      console.log(`webhooks not implemented for connector ${ctx.state.params.entityId}`);
      ctx.status = 404;
      return;
    }

    const isValid = this.ValidateWebhookEvent(ctx, WebhookSigningSecret);
    if (!isValid) {
      console.log(`webhook event failed validation for connector ${ctx.state.params.entityId}`);
      ctx.status = 400;
      return;
    }

    const event: Connector.Types.WebhookEvent = {
      authId,
      event: ctx.req.body,
    };
    // Skip if converter fails to create enveloped event
    if (event) {
      // Process with no await.  Happily happens in background, to ensure quick response to
      // webhook caller, demonstrate webhook has been received and stored on our end.
      try {
        const processPromise = this.processWebhook(ctx, event);
        return await this.CreateWebhookResponse(ctx, processPromise);
      } catch (e) {}
    }
  };

  public processWebhook = async (ctx: Connector.Types.Context, event: Connector.Types.WebhookEvent): Promise<void> => {
    // Relevant Instances are gathered by the following method:
    //
    // Identity Sessions will be saved with some `authId` value that is included on both
    // the event and auth request.  For slack, this is a simple userId or botId
    //
    // Upon processing of Sessions, this authId is saved to both the associated Identity and Instance, in the format of
    // `webhookId/<connectorId>/<authId>`.  This is a tag key, with null value.
    const connectorId = ctx.state.params.entityId;
    const webhookEventId = ['webhook', connectorId, event.authId].join('/');
    const accountUrl = ctx.state.params.baseUrl.split('/connector/')[0];

    const response = await superagent
      .get(`${accountUrl}/integration/-/instance?tag=${encodeURIComponent(webhookEventId)}`)
      .set('Authorization', `Bearer ${ctx.state.params.functionAccessToken}`);
    const instances: any[] = response.body.items;

    const instancesByIntegrationId: any[] = instances.reduce((acc, cur) => {
      const integrationId = cur.integrationId;
      console.log(integrationId);
      if (!!acc[integrationId]) {
        acc[integrationId] = [];
      }
      acc[integrationId].push(cur.entityId);
      return acc;
    }, {});

    const webhookEventName = this.GetWebhookEventName(ctx);

    try {
      await Promise.all(
        Object.entries<string[]>(instancesByIntegrationId).map(async ([integrationId, instanceIds]) => {
          const eventPayload: Connector.Types.WebhookEventPayload = {
            event: webhookEventName,
            parameters: {
              event,
              instanceIds,
              connectorId,
              webhookEventId,
            },
          };
          return superagent
            .post(`${accountUrl}/integration/${integrationId}/api/event`)
            .set('Authorization', `Bearer ${ctx.state.params.functionAccessToken}`)
            .send(eventPayload);
        })
      );
    } catch (e) {
      console.log('error dispatching events');
      console.log(e);
    }
  };

  // Setters allow for individual Connectors to easily apply unique values if need be
  // GetWebhookAuthId takes an external event and extracts the authId
  // CreateWebhookResponse sets any necessary response elements that the caller requires
  // ValidateWebhookEvent validates the hash
  // GetEventName gets the event name from the request
  public setGetWebhookAuthId = (handler: (event: any) => string | void): void => {
    this.GetWebhookAuthId = handler;
  };
  public setGetOAuthAuthId = (handler: (token: any) => string | void): void => {
    console.log('updating oauth auth Id');
    this.GetOAuthAuthId = handler;
  };
  public setCreateWebhookResponse = (
    handler: (
      ctx: Connector.Types.Context,
      processPromise?: Promise<Connector.Types.WebhookEvent | void>
    ) => Promise<void>
  ) => {
    this.CreateWebhookResponse = handler;
  };
  public setValidateWebhookEvent = (handler: (ctx: Connector.Types.Context, signingSecret: string) => boolean) => {
    this.ValidateWebhookEvent = handler;
  };
  public setGetWebhookEventName = (handler: (ctx: Connector.Types.Context) => string) => {
    this.GetWebhookEventName = handler;
  };
  public setInitializationChallenge = (handler: (ctx: Connector.Types.Context) => boolean) => {
    this.InitializationChallenge = handler;
  };

  // Default configuration functions
  private GetWebhookAuthId: (event: any) => string | void = (event: any) => {};
  public GetOAuthAuthId: (token: any) => string | void = (token) => {
    console.log('no authId for token');
  };
  private CreateWebhookResponse: (
    ctx: Connector.Types.Context,
    processPromise?: Promise<Connector.Types.WebhookEvent | void>
  ) => Promise<void> = async (
    ctx: Connector.Types.Context,
    processPromise?: Promise<Connector.Types.WebhookEvent | void>
  ) => {};
  private ValidateWebhookEvent: (ctx: Connector.Types.Context, signingSecret: string) => boolean = (
    ctx,
    signingSecret
  ) => false;
  private GetWebhookEventName: (ctx: Connector.Types.Context) => string = (ctx) => `event:${ctx.state.params.entityId}`;
  private InitializationChallenge: (ctx: Connector.Types.Context) => boolean = (ctx) => false;
}

class Connector extends EntityBase {
  constructor() {
    super();
    this.router.post('/api/fusebit_webhook_event', async (ctx: Connector.Types.Context) => {
      await this.service.handleWebhookEvent(ctx, this.WebhookSigningSecret || '');
    });
    this.router.on('startup', ({ cfg, mgr }: Connector.Types.IOnStartup, next: Connector.Types.Next) => {
      this.WebhookSigningSecret = cfg.configuration.signingSecret;
      next();
    });
  }
  private WebhookSigningSecret?: string;
  public service = new Service();
  public middleware = new EntityBase.MiddlewareDefault();
  public storage = new EntityBase.StorageDefault();
  public response = new EntityBase.ResponseDefault();
}
namespace Connector {
  export namespace Types {
    export type Context = EntityBase.Types.Context;
    export type Next = EntityBase.Types.Next;
    export interface IOnStartup extends EntityBase.Types.IOnStartup {}
    export type WebhookEvent = {
      authId: string;
      event: any;
    };
    export type WebhookEventPayload = {
      event: string; // event name
      parameters: {
        connectorId: string;
        instanceIds: string[];
        webhookEventId: string;
        event: any;
      };
    };
  }
}
export default Connector;
