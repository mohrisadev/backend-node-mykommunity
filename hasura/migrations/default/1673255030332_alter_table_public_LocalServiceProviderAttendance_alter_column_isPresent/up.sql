ALTER TABLE "public"."LocalServiceProviderAttendance" ALTER COLUMN "isPresent" TYPE text;
alter table "public"."LocalServiceProviderAttendance" rename column "isPresent" to "status";
