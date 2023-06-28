alter table "public"."Sos"
  add constraint "Sos_rentalUnitId_fkey"
  foreign key ("rentalUnitId")
  references "public"."RentalUnits"
  ("id") on update restrict on delete restrict;
