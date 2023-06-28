CREATE TABLE "public"."VisitorStatus" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "createdAt" Timestamp NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), "visitorId" uuid NOT NULL, PRIMARY KEY ("id") , FOREIGN KEY ("visitorId") REFERENCES "public"."Visitors"("id") ON UPDATE restrict ON DELETE cascade);
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
CREATE TRIGGER "set_public_VisitorStatus_updatedAt"
BEFORE UPDATE ON "public"."VisitorStatus"
FOR EACH ROW
EXECUTE PROCEDURE "public"."set_current_timestamp_updatedAt"();
COMMENT ON TRIGGER "set_public_VisitorStatus_updatedAt" ON "public"."VisitorStatus" 
IS 'trigger to set value of column "updatedAt" to current timestamp on row update';
CREATE EXTENSION IF NOT EXISTS pgcrypto;
