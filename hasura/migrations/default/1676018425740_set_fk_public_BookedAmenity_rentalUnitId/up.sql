alter table "public"."BookedAmenity"
  add constraint "BookedAmenity_rentalUnitId_fkey"
  foreign key ("rentalUnitId")
  references "public"."RentalUnits"
  ("id") on update restrict on delete restrict;
