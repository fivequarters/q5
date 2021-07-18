-- Update the record, if it's present and the versions match. If it's not present, either report not_found or
-- (if upsert is true), perform an insertion.
CREATE OR REPLACE FUNCTION update_if_version(
  eType entity_type, aId VARCHAR, sId VARCHAR, eId VARCHAR,
  filterExpired BOOLEAN, prefixMatchId BOOLEAN, upsert BOOLEAN,
  dataParam JSONB, tagsParam JSONB, expiresParam timestamptz,
  versionParam CHAR(36) DEFAULT NULL)
    RETURNS SETOF entity AS $$
DECLARE
  action_cursor REFCURSOR;
  resultRow entity%ROWTYPE;
BEGIN
  IF upsert AND filterExpired THEN
    RAISE EXCEPTION 'illegal use of both upsert and filterExpired' USING errcode = '22003';
  END IF;
  SELECT * FROM check_if_version(
    eType, aId, sId, eId, filterExpired, prefixMatchId, versionParam)
  INTO action_cursor;

  RETURN QUERY UPDATE entity
    SET
      data = COALESCE(dataParam, entity.data),
      tags = COALESCE(tagsParam, entity.tags),
      expires = COALESCE(expiresParam, entity.expires),
      version = gen_random_uuid()
    WHERE CURRENT OF action_cursor
    RETURNING entity.*;
  CLOSE action_cursor;

  EXCEPTION WHEN SQLSTATE '22001' THEN
    IF NOT upsert THEN
      RAISE EXCEPTION 'not_found' USING errcode = '22001';
    END IF;
    RETURN QUERY INSERT INTO entity(entityType, accountId, subscriptionId, entityId, data, tags, version, expires)
      VALUES ( eType, aId, sId, eId, dataParam, tagsParam, gen_random_uuid(), expiresParam) RETURNING *;
END;
$$ LANGUAGE PLPGSQL;
