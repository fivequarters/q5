import { Text } from '@5qtrs/text';
import { IExecuteInput } from '@5qtrs/cli';
import { ProfileService } from './ProfileService';
import { ExecuteService } from './ExecuteService';
import { IBaseComponentType, BaseComponentService } from './BaseComponentService';
import { IIntegrationData, EntityType } from '@fusebit/schema';
import open from 'open';

interface IIntegration extends IBaseComponentType {
  data: IIntegrationData;
}

export class IntegrationService extends BaseComponentService<IIntegration> {
  private constructor(profileService: ProfileService, executeService: ExecuteService, input: IExecuteInput) {
    super(EntityType.integration, profileService, executeService, input, 'Integration');
  }

  public static async create(input: IExecuteInput) {
    const executeService = await ExecuteService.create(input);
    const profileService = await ProfileService.create(input);
    return new IntegrationService(profileService, executeService, input);
  }

  public createEmptySpec(): IIntegration {
    return {
      id: 'unknown id',
      data: {
        handler: './integration',
        configuration: {},
        components: [],
        componentTags: {},
        files: {},
        encodedFiles: {},
      },
      tags: {},
    };
  }

  public async displayEntities(items: IIntegration[], firstDisplay: boolean) {
    const profile = await this.profileService.getExecutionProfile(['account', 'subscription']);
    if (!items.length) {
      await this.executeService.info('No Integrations', `No ${firstDisplay ? '' : 'more '}integrations to list`);
      return;
    }

    for (const item of items) {
      const tagSummary = ['Tags:', Text.eol()];
      const expiresSummary = item.expires ? ['Expires: ', Text.bold(item.expires), Text.eol(), Text.eol()] : [];

      if (item.tags) {
        Object.entries(item.tags).forEach(([tagKey, tagValue]: [string, string | null]) => {
          tagSummary.push(Text.dim('• '), tagKey, Text.dim(': '), tagValue || '', Text.eol());
        });
      }

      if (tagSummary.length > 0) {
        tagSummary.push(Text.eol());
      }

      await this.executeService.message(
        Text.bold(item.id),
        Text.create([
          `Handler: `,
          Text.bold(item.data.handler || ''),
          Text.eol(),
          Text.eol(),
          ...tagSummary,
          ...expiresSummary,
          'Version',
          Text.dim(': '),
          item.version || 'unknown',
          Text.eol(),
          Text.eol(),
          'Base URL is given below',
          Text.dim(': '),
        ])
      );
      await this.input.io.writeLineRaw(this.getUrl(profile, item.id));
      await this.input.io.writeLine();
    }
  }

  public async openDemoApp(integrationId: string, tenantId: string) {
    const profile = await this.profileService.getExecutionProfile(['account', 'subscription']);

    const demoAppUrl = `https://cdn.fusebit.io/fusebit/app/index.html#accessToken=${
      profile.accessToken
    }&tenantId=${encodeURIComponent(tenantId)}&integrationBaseUrl=${profile.baseUrl}/v2/account/${
      profile.account
    }/subscription/${profile.subscription}/integration/${integrationId}`;

    await this.executeService.result(
      `Test ${integrationId}`,
      Text.create(
        "Testing the '",
        Text.bold(`${integrationId}`),
        `' integration for tenant ID '`,
        Text.bold(`${tenantId}`),
        `'.`,
        Text.eol(),
        Text.eol(),
        'If the browser does not open up automatically, navigate to the URL shown below:'
      )
    );

    console.log(demoAppUrl);
    console.log();

    open(demoAppUrl);
  }
}
