alter table "public"."Sos" alter column "rentalUnitId" drop not null;
alter table "public"."Sos" add column "rentalUnitId" uuid;
