import { Text } from '@5qtrs/text';
import { IExecuteInput } from '@5qtrs/cli';
import { ProfileService } from './ProfileService';
import { ExecuteService } from './ExecuteService';

import { IBaseComponentType, BaseComponentService } from './BaseComponentService';

import { IConnectorData, EntityType } from '@fusebit/schema';

interface IConnector extends IBaseComponentType {
  data: IConnectorData;
}

export class ConnectorService extends BaseComponentService<IConnector> {
  private constructor(profileService: ProfileService, executeService: ExecuteService, input: IExecuteInput) {
    super(EntityType.connector, profileService, executeService, input);
    this.entityType = EntityType.connector;
  }

  public static async create(input: IExecuteInput) {
    const executeService = await ExecuteService.create(input);
    const profileService = await ProfileService.create(input);
    return new ConnectorService(profileService, executeService, input);
  }

  public createEmptySpec(): IConnector {
    return {
      id: 'unknown id',
      data: { handler: '', configuration: {}, files: {}, encodedFiles: {} },
      tags: {},
    };
  }

  public async displayEntities(items: IConnector[], firstDisplay: boolean) {
    const profile = await this.profileService.getExecutionProfile(['account', 'subscription']);
    if (!items.length) {
      await this.executeService.info('No Connectors', `No ${firstDisplay ? '' : 'more '}connectors to list`);
      return;
    }

    for (const item of items) {
      const tagSummary = ['Tags:', Text.eol()];

      if (item.tags) {
        Object.entries(item.tags).forEach(([tagKey, tagValue]: [string, string | null]) => {
          tagSummary.push(Text.dim('• '), tagKey, Text.dim(': '), tagValue || '', Text.eol());
        });
      }

      await this.executeService.message(
        Text.bold(item.id),
        Text.create([
          `Handler: `,
          Text.bold(item.data.handler || ''),
          Text.eol(),
          Text.eol(),
          ...tagSummary,
          Text.eol(),
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
}
