alter table "public"."BookedAmenityStatus"
  add constraint "AmenityStatus_amenityId_fkey"
  foreign key ("bookedAmenityId")
  references "public"."Amenities"
  ("id") on update restrict on delete restrict;
