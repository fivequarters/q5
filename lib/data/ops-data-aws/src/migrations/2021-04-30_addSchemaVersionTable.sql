-- The schemaVersion table holds the current database schema version.

create table schemaVersion (
    onerow_id bool primary key default true,
    version int,
    fuse_ops_version varchar(30),
    constraint onerow_uni check (onerow_id)
);

revoke delete, truncate on schemaVersion from public;

insert into schemaVersion values (true, -1);
