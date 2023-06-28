alter table "public"."Visitors"
  add constraint "Visitors_parcelCollectedBy_fkey"
  foreign key ("parcelCollectedBy")
  references "public"."Users"
  ("id") on update restrict on delete cascade;
