import RDS from '@5qtrs/db';

beforeAll(() => {});

afterEach(async () => {}, 5000);

describe('DB Prerequisites', () => {
  test('RDS Data Services connection can be established', async () => {
    const rds = await RDS.ensureConnection();
    expect(rds).toBeDefined();
  }, 5000);
});
