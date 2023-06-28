alter table "public"."LocalServiceProviderAttendance" rename column "status" to "isPresent";
ALTER TABLE "public"."LocalServiceProviderAttendance" ALTER COLUMN "isPresent" TYPE boolean;
