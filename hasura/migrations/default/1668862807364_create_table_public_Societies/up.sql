CREATE TABLE "public"."Societies" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), "cityId" uuid NOT NULL, "name" text NOT NULL, "pinCode" integer NOT NULL, "builderName" text, "disabled" boolean NOT NULL DEFAULT false, "address" text NOT NULL, PRIMARY KEY ("id") , FOREIGN KEY ("cityId") REFERENCES "public"."Cities"("id") ON UPDATE restrict ON DELETE cascade);
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
CREATE TRIGGER "set_public_Societies_updatedAt"
BEFORE UPDATE ON "public"."Societies"
FOR EACH ROW
EXECUTE PROCEDURE "public"."set_current_timestamp_updatedAt"();
COMMENT ON TRIGGER "set_public_Societies_updatedAt" ON "public"."Societies" 
IS 'trigger to set value of column "updatedAt" to current timestamp on row update';
CREATE EXTENSION IF NOT EXISTS pgcrypto;
