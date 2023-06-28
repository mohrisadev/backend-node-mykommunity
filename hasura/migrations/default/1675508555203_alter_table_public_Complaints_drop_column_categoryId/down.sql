alter table "public"."Complaints" alter column "categoryId" drop not null;
alter table "public"."Complaints" add column "categoryId" text;
