/* tslint:disable no-namespace no-empty-interface max-classes-per-file */
import EntityBase from './EntityBase';
import superagent from 'superagent';

class Service extends EntityBase.ServiceDefault {
  public handleWebhookEvent = async (ctx: EntityBase.Types.Context) => {
    const webhookAuthId = await this.getEventAuthId(ctx);
    const isChallenge = await this.initializationChallenge(ctx);
    if (!webhookAuthId && !isChallenge) {
      ctx.throw(400, `webhooks not implemented for connector ${ctx.state.params.entityId}`);
      return;
    }

    const isValid = this.validateWebhookEvent(ctx);
    if (!isValid) {
      ctx.throw(400, `webhook event failed validation for connector ${ctx.state.params.entityId}`);
      return;
    }

    if (isChallenge) {
      ctx.status = 200;
      return;
    }

    // Process with no await.  Happily happens in background, to ensure quick response to
    // webhook caller, demonstrate webhook has been received and stored on our end.
    try {
      const processPromise = this.processWebhook(ctx, ctx.req.body, webhookAuthId as string);
      return await this.createWebhookResponse(ctx, processPromise);
    } catch (e) {}
  };

  public processWebhook = async (
    ctx: Connector.Types.Context,
    event: any,
    webhookAuthId: string
  ): Promise<superagent.Response | void> => {
    try {
      const webhookEventId = this.getWebhookLookupId(ctx);
      const webhookEventType = this.getWebhookEventType(ctx);

      return await superagent
        .post(
          `${ctx.state.params.baseUrl}/fan_out/event/webhook/${
            ctx.state.params.entityId
          }/${webhookEventType}?tag=${encodeURIComponent(webhookEventId)}`
        )
        .set('Authorization', `Bearer ${ctx.state.params.functionAccessToken}`)
        .send({
          data: event,
          connectorId: ctx.state.params.entityId,
          webhookEventId,
          webhookAuthId,
        })
        .ok((res) => true);
    } catch (e) {
      console.log(`Error processing event:`);
      console.log(e);
    }
  };

  public getWebhookLookupId(ctx: Connector.Types.Context): string {
    const authId = this.getEventAuthId(ctx);
    const connectorId = ctx.state.params.entityId;
    return ['webhook', connectorId, authId].join('/');
  }

  public getWebhookTokenId(ctx: Connector.Types.Context, token: any): string {
    const authId = this.getTokenAuthId(token);
    const connectorId = ctx.state.params.entityId;
    return ['webhook', connectorId, authId].join('/');
  }

  // Setters allow for individual Connectors to easily apply unique values if need be
  // getEventAuthId takes an external event and extracts the authId
  // createWebhookResponse sets any necessary response elements that the caller requires
  // validateWebhookEvent validates the hash
  // GetEventName gets the event name from the request
  public setGetEventAuthId = (handler: (event: any) => string | void): void => {
    this.getEventAuthId = handler;
  };
  public setGetTokenAuthId = (handler: (token: any) => string | void): void => {
    this.getTokenAuthId = handler;
  };
  public setCreateWebhookResponse = (
    handler: (ctx: Connector.Types.Context, processPromise?: Promise<any>) => Promise<void>
  ) => {
    this.createWebhookResponse = handler;
  };
  public setValidateWebhookEvent = (handler: (ctx: Connector.Types.Context) => boolean) => {
    this.validateWebhookEvent = handler;
  };
  public setGetWebhookEventType = (handler: (ctx: Connector.Types.Context) => string) => {
    this.getWebhookEventType = handler;
  };
  public setInitializationChallenge = (handler: (ctx: Connector.Types.Context) => boolean) => {
    this.initializationChallenge = handler;
  };

  // Default configuration functions
  private getEventAuthId = (ctx: Connector.Types.Context): string | void => {
    ctx.throw(500, 'Event AuthId configuration missing.  Required for webhook processing.');
  };
  private getTokenAuthId = (token: any): string | void => {
    throw 'Token AuthId configuration missing.  Required for webhook processing.';
  };
  private createWebhookResponse = async (
    ctx: Connector.Types.Context,
    processPromise?: Promise<any>
  ): Promise<void> => {
    console.log(500, 'Webhook Response configuration missing.');
  };
  private validateWebhookEvent = (ctx: Connector.Types.Context): boolean => {
    ctx.throw(500, 'Webhook Validation configuration missing. Required for webhook processing.');
    return false;
  };
  private getWebhookEventType = (ctx: Connector.Types.Context): string => {
    console.log('Using default webhook event name.');
    return `${ctx.state.params.entityId}`;
  };
  private initializationChallenge = (ctx: Connector.Types.Context): boolean => {
    ctx.throw(500, 'Webhook Challenge configuration missing. Required for webhook processing.');
    return false;
  };
}

class Connector extends EntityBase {
  constructor() {
    super();
    this.router.post('/api/fusebit_webhook_event', async (ctx: Connector.Types.Context) => {
      await this.service.handleWebhookEvent(ctx);
    });
  }
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
    export type WebhookEventPayload = {
      event: string; // event name
      parameters: {
        connectorId: string;
        instanceIds: string[];
        webhookEventId: string;
        event: any;
        webhookAuthId: string;
      };
    };
  }
}
export default Connector;
