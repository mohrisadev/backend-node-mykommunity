alter table "public"."Notices"
  add constraint "Notices_societyId_fkey"
  foreign key ("societyId")
  references "public"."Societies"
  ("id") on update restrict on delete restrict;
