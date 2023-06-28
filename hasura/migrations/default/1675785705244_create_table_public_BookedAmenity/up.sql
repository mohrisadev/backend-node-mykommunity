CREATE TABLE "public"."BookedAmenity" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), "amenityId" uuid NOT NULL, "userId" uuid NOT NULL, "startTime" timestamptz NOT NULL, "endTime" timestamptz NOT NULL, "amountPaid" integer NOT NULL, "status" text NOT NULL, PRIMARY KEY ("id") , FOREIGN KEY ("amenityId") REFERENCES "public"."Amenities"("id") ON UPDATE restrict ON DELETE restrict, FOREIGN KEY ("userId") REFERENCES "public"."Users"("id") ON UPDATE restrict ON DELETE restrict);
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
CREATE TRIGGER "set_public_BookedAmenity_updatedAt"
BEFORE UPDATE ON "public"."BookedAmenity"
FOR EACH ROW
EXECUTE PROCEDURE "public"."set_current_timestamp_updatedAt"();
COMMENT ON TRIGGER "set_public_BookedAmenity_updatedAt" ON "public"."BookedAmenity" 
IS 'trigger to set value of column "updatedAt" to current timestamp on row update';
CREATE EXTENSION IF NOT EXISTS pgcrypto;
