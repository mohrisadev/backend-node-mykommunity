alter table "public"."UserRoles" add column "isOwner" boolean
 not null default 'false';
