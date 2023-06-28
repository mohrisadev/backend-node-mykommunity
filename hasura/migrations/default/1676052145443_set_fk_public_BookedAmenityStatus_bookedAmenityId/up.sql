alter table "public"."BookedAmenityStatus"
  add constraint "BookedAmenityStatus_bookedAmenityId_fkey"
  foreign key ("bookedAmenityId")
  references "public"."BookedAmenity"
  ("id") on update restrict on delete restrict;
