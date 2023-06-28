alter table "public"."Sos"
  add constraint "Sos_societyId_fkey"
  foreign key ("societyId")
  references "public"."Societies"
  ("id") on update restrict on delete restrict;
