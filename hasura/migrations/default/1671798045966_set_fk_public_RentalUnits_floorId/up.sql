alter table "public"."RentalUnits"
  add constraint "RentalUnits_floorId_fkey"
  foreign key ("floorId")
  references "public"."Floors"
  ("id") on update restrict on delete cascade;
