CREATE TABLE "public"."LocalServiceProviderAttendance" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), "localServiceProviderId" uuid NOT NULL, "rentalUnitId" uuid NOT NULL, "userId" uuid NOT NULL, "isPresent" boolean NOT NULL, PRIMARY KEY ("id") , FOREIGN KEY ("localServiceProviderId") REFERENCES "public"."LocalServiceProviders"("id") ON UPDATE restrict ON DELETE restrict, FOREIGN KEY ("rentalUnitId") REFERENCES "public"."RentalUnits"("id") ON UPDATE restrict ON DELETE restrict, FOREIGN KEY ("userId") REFERENCES "public"."Users"("id") ON UPDATE restrict ON DELETE restrict);
CREATE OR REPLACE FUNCTION "public"."set_current_timestamp_updatedAt"()
RETURNS TRIGGER AS $$
DECLARE
  _new record;
BEGIN
  _new := NEW;
  _new."updatedAt" = NOW();
  RETURN _new;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "set_public_LocalServiceProviderAttendance_updatedAt"
BEFORE UPDATE ON "public"."LocalServiceProviderAttendance"
FOR EACH ROW
EXECUTE PROCEDURE "public"."set_current_timestamp_updatedAt"();
COMMENT ON TRIGGER "set_public_LocalServiceProviderAttendance_updatedAt" ON "public"."LocalServiceProviderAttendance" 
IS 'trigger to set value of column "updatedAt" to current timestamp on row update';
CREATE EXTENSION IF NOT EXISTS pgcrypto;
