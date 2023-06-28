CREATE TABLE "public"."LocalServiceProviderAndRentalUnits" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), "rentalUnitId" uuid NOT NULL, "localServiceProviderId" uuid NOT NULL, "isActive" boolean NOT NULL DEFAULT true, PRIMARY KEY ("id") , FOREIGN KEY ("localServiceProviderId") REFERENCES "public"."LocalServiceProviders"("id") ON UPDATE restrict ON DELETE restrict, FOREIGN KEY ("rentalUnitId") REFERENCES "public"."RentalUnits"("id") ON UPDATE restrict ON DELETE restrict);
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
CREATE TRIGGER "set_public_LocalServiceProviderAndRentalUnits_updatedAt"
BEFORE UPDATE ON "public"."LocalServiceProviderAndRentalUnits"
FOR EACH ROW
EXECUTE PROCEDURE "public"."set_current_timestamp_updatedAt"();
COMMENT ON TRIGGER "set_public_LocalServiceProviderAndRentalUnits_updatedAt" ON "public"."LocalServiceProviderAndRentalUnits" 
IS 'trigger to set value of column "updatedAt" to current timestamp on row update';
CREATE EXTENSION IF NOT EXISTS pgcrypto;
