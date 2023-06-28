CREATE TABLE "public"."NoteToGuard" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), "societyId" uuid NOT NULL, "rentalUnitId" uuid NOT NULL, "userId" uuid NOT NULL, "attachment" text, "image" text, "note" text NOT NULL, PRIMARY KEY ("id") , FOREIGN KEY ("rentalUnitId") REFERENCES "public"."RentalUnits"("id") ON UPDATE restrict ON DELETE restrict, FOREIGN KEY ("userId") REFERENCES "public"."Users"("id") ON UPDATE restrict ON DELETE restrict, FOREIGN KEY ("societyId") REFERENCES "public"."Societies"("id") ON UPDATE restrict ON DELETE restrict);
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
CREATE TRIGGER "set_public_NoteToGuard_updatedAt"
BEFORE UPDATE ON "public"."NoteToGuard"
FOR EACH ROW
EXECUTE PROCEDURE "public"."set_current_timestamp_updatedAt"();
COMMENT ON TRIGGER "set_public_NoteToGuard_updatedAt" ON "public"."NoteToGuard" 
IS 'trigger to set value of column "updatedAt" to current timestamp on row update';
CREATE EXTENSION IF NOT EXISTS pgcrypto;
