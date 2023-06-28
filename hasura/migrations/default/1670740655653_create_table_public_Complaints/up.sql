CREATE TABLE "public"."Complaints" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), "userId" uuid NOT NULL, "rentalUnitId" uuid NOT NULL, "category" text NOT NULL, "subCategory" text NOT NULL, "type" text NOT NULL, "message" text NOT NULL, "imageLink" text, "rating" numeric, "status" text NOT NULL, "societyId" uuid NOT NULL, PRIMARY KEY ("id") , FOREIGN KEY ("societyId") REFERENCES "public"."Societies"("id") ON UPDATE restrict ON DELETE restrict, FOREIGN KEY ("userId") REFERENCES "public"."Users"("id") ON UPDATE restrict ON DELETE restrict, FOREIGN KEY ("rentalUnitId") REFERENCES "public"."RentalUnits"("id") ON UPDATE restrict ON DELETE restrict);
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
CREATE TRIGGER "set_public_Complaints_updatedAt"
BEFORE UPDATE ON "public"."Complaints"
FOR EACH ROW
EXECUTE PROCEDURE "public"."set_current_timestamp_updatedAt"();
COMMENT ON TRIGGER "set_public_Complaints_updatedAt" ON "public"."Complaints" 
IS 'trigger to set value of column "updatedAt" to current timestamp on row update';
CREATE EXTENSION IF NOT EXISTS pgcrypto;
