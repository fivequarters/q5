import * as Db from '@5qtrs/db';
import * as Entity from './db.entity';

describe('DB integration', () => {
  Entity.createEntityTests({
    get: Db.getIntegration as Entity.GetFunc,
    create: Db.createIntegration as Entity.CreateFunc,
    update: Db.updateIntegration as Entity.UpdateFunc,
    delete: Db.deleteIntegration as Entity.DeleteFunc,
    list: Db.listIntegrations as Entity.ListFunc,
    getTags: Db.getIntegrationTags as Entity.GetTagsFunc,
    setTags: Db.setIntegrationTags as Entity.SetTagsFunc,
    setTag: Db.setIntegrationTag as Entity.SetTagFunc,
    deleteTag: Db.deleteIntegrationTag as Entity.DeleteTagFunc,
  });
});
