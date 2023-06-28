alter table "public"."UserRoles" alter column "isActive" set default true;
alter table "public"."UserRoles" alter column "isActive" drop not null;
alter table "public"."UserRoles" add column "isActive" bool;
