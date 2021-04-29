import * as Db from '@5qtrs/db';
import * as Entity from './db.entity';

describe('DB connector', () => {
  Entity.createEntityTests({
    get: Db.getConnector as Entity.GetFunc,
    create: Db.createConnector as Entity.CreateFunc,
    update: Db.updateConnector as Entity.UpdateFunc,
    delete: Db.deleteConnector as Entity.DeleteFunc,
    list: Db.listConnectors as Entity.ListFunc,
    getTags: Db.getConnectorTags as Entity.GetTagsFunc,
    setTags: Db.setConnectorTags as Entity.SetTagsFunc,
    setTag: Db.setConnectorTag as Entity.SetTagFunc,
    deleteTag: Db.deleteConnectorTag as Entity.DeleteTagFunc,
  });
});
