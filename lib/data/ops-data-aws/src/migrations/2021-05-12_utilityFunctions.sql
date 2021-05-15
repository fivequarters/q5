-- Reference for later: https://stackoverflow.com/questions/8605174/postgresql-error-42601-a-column-definition-list-is-required-for-functions-ret

-- Fetch the first row; if it's not present, raise an exception for not_found.  If the version parameter is
-- supplied, then check the version and raise a conflict_data exception if it doesn't match.
CREATE OR REPLACE FUNCTION check_if_version(
  eType entity_type, aId VARCHAR, sId VARCHAR, eId VARCHAR,
  filterExpired BOOLEAN, prefixMatchId BOOLEAN,
  versionParam CHAR(36))
    RETURNS REFCURSOR AS $$
DECLARE
  action_cursor CURSOR FOR
    SELECT * FROM entity
    WHERE
      entityType = eType
      AND accountId = aId
      AND subscriptionId = sId
      AND (NOT filterExpired OR expires IS NULL OR expires > NOW())
      AND (prefixMatchId OR entityId = eId)
      AND (NOT prefixMatchId OR entityId LIKE FORMAT('%s%%',eId));
  targetEntity entity%ROWTYPE;
  error BOOLEAN;
BEGIN
  OPEN action_cursor;
  FETCH FIRST FROM action_cursor INTO targetEntity;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found' USING errcode = '22001';
  END IF;
  IF versionParam IS NOT NULL AND targetEntity.version != versionParam THEN
    RAISE EXCEPTION 'conflict_data' USING errcode = '22002';
  END IF;

  RETURN action_cursor;
END;
$$ LANGUAGE PLPGSQL;

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

  EXCEPTION WHEN SQLSTATE '22001' THEN
    IF NOT upsert THEN
      RAISE EXCEPTION 'not_found' USING errcode = '22001';
    END IF;
    RETURN QUERY INSERT INTO entity(entityType, accountId, subscriptionId, entityId, data, tags, version, expires) 
      VALUES ( eType, aId, sId, eId, dataParam, tagsParam, gen_random_uuid(), expiresParam) RETURNING *;
END;
$$ LANGUAGE PLPGSQL;

-- Search for the targetted rows, and delete if the version matches.  Return the number of rows deleted.
CREATE OR REPLACE FUNCTION delete_if_version(
  eType entity_type, aId VARCHAR, sId VARCHAR, eId VARCHAR,
  filterExpired BOOLEAN, prefixMatchId BOOLEAN,
  versionParam CHAR(36) DEFAULT NULL)
    RETURNS INTEGER AS $$
DECLARE
  action_cursor REFCURSOR;
  action_cnt INTEGER;
  row_cnt INTEGER;
  action_rec RECORD;
BEGIN
  SELECT * FROM check_if_version(
    eType, aId, sId, eId, filterExpired, prefixMatchId, versionParam)
  INTO action_cursor;

  row_cnt := 0;

  LOOP
    DELETE FROM entity WHERE CURRENT OF action_cursor;
    GET DIAGNOSTICS action_cnt = ROW_COUNT;
    row_cnt := row_cnt + action_cnt;
    FETCH NEXT FROM action_cursor INTO action_rec;
    EXIT WHEN action_rec IS NULL;
  END LOOP;

  RETURN row_cnt;
END;
$$ LANGUAGE PLPGSQL;

-- Set the value of a specific tag in an entity if it matches the criteria.  Return the new version and the
-- new tags.
CREATE OR REPLACE FUNCTION update_tag_if_version(
  eType entity_type, aId VARCHAR, sId VARCHAR, eId VARCHAR,
  filterExpired BOOLEAN, prefixMatchId BOOLEAN,
  tagKey VARCHAR, tagValue JSONB,
  versionParam CHAR(36) DEFAULT NULL)
    RETURNS SETOF entity AS $$
DECLARE
  action_cursor REFCURSOR;
  resultRow entity%ROWTYPE;
  action_rec RECORD;
BEGIN
  SELECT * FROM check_if_version(
    eType, aId, sId, eId, filterExpired, prefixMatchId, versionParam)
  INTO action_cursor;

  LOOP
    RETURN QUERY UPDATE entity
      SET
        tags = jsonb_set(tags, FORMAT('{%s}', tagKey)::text[], to_jsonb(tagValue)),
        version = gen_random_uuid()
      WHERE CURRENT OF action_cursor
      RETURNING entity.*;
    FETCH NEXT FROM action_cursor INTO action_rec;
    EXIT WHEN action_rec IS NULL;
  END LOOP;
END;
$$ LANGUAGE PLPGSQL;

-- Delete a specific tag from an entity if it matches the criteria.  Return the new version and the new tags.
CREATE OR REPLACE FUNCTION delete_tag_if_version(
  eType entity_type, aId VARCHAR, sId VARCHAR, eId VARCHAR,
  filterExpired BOOLEAN, prefixMatchId BOOLEAN,
  tagKey VARCHAR,
  versionParam CHAR(36) DEFAULT NULL)
    RETURNS SETOF entity AS $$
DECLARE
  action_cursor REFCURSOR;
  resultRow entity%ROWTYPE;
  action_rec RECORD;
BEGIN
  SELECT * FROM check_if_version(
    eType, aId, sId, eId, filterExpired, prefixMatchId, versionParam)
  INTO action_cursor;

  LOOP
    RETURN QUERY UPDATE entity
      SET
        tags = tags - tagKey,
        version = gen_random_uuid()
      WHERE CURRENT OF action_cursor
      RETURNING entity.*;
    FETCH NEXT FROM action_cursor INTO action_rec;
    EXIT WHEN action_rec IS NULL;
  END LOOP;
END;
$$ LANGUAGE PLPGSQL;
