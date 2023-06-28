alter table "public"."Sos" alter column "sosId" drop not null;
alter table "public"."Sos" add column "sosId" text;
