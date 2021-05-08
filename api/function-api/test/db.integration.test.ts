import { Model, Integration } from '@5qtrs/db';
import createEntityTests, { EntityAssertions } from './db.entity';

const entityAssertions: EntityAssertions<Model.IIntegration> = {
  create: (arg) => arg,
  delete: (arg) => arg,
  get: (arg) => arg,
  list: (arg) => arg,
  tags: { get: (arg) => arg, set: (arg) => arg, update: (arg) => arg },
  update: (arg) => arg,
};

describe('DB integration', () => {
  //Entity.createEntityTests();
  const entity = new Integration();
  createEntityTests<Model.IIntegration>(entity, entityAssertions);
});
