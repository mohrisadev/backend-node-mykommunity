alter table "public"."Notices"
  add constraint "Notices_userId_fkey"
  foreign key ("userId")
  references "public"."Users"
  ("id") on update restrict on delete restrict;
