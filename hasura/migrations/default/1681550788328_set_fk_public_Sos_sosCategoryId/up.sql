alter table "public"."Sos"
  add constraint "Sos_sosCategoryId_fkey"
  foreign key ("sosCategoryId")
  references "public"."SosCategory"
  ("id") on update restrict on delete restrict;
