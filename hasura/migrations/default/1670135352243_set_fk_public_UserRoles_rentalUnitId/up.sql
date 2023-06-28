alter table "public"."UserRoles"
  add constraint "UserRoles_rentalUnitId_fkey"
  foreign key ("rentalUnitId")
  references "public"."RentalUnits"
  ("id") on update restrict on delete restrict;
