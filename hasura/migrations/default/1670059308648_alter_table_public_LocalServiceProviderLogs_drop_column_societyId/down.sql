alter table "public"."LocalServiceProviderLogs" alter column "societyId" drop not null;
alter table "public"."LocalServiceProviderLogs" add column "societyId" uuid;
