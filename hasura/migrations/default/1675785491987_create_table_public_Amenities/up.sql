CREATE TABLE "public"."Amenities" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), "societyId" uuid NOT NULL, "name" text NOT NULL, "type" text NOT NULL, "pricePerSlot" integer NOT NULL, PRIMARY KEY ("id") , FOREIGN KEY ("societyId") REFERENCES "public"."Societies"("id") ON UPDATE restrict ON DELETE restrict);
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
CREATE TRIGGER "set_public_Amenities_updatedAt"
BEFORE UPDATE ON "public"."Amenities"
FOR EACH ROW
EXECUTE PROCEDURE "public"."set_current_timestamp_updatedAt"();
COMMENT ON TRIGGER "set_public_Amenities_updatedAt" ON "public"."Amenities" 
IS 'trigger to set value of column "updatedAt" to current timestamp on row update';
CREATE EXTENSION IF NOT EXISTS pgcrypto;
