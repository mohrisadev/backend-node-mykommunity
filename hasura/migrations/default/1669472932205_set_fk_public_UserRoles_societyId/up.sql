alter table "public"."UserRoles"
  add constraint "UserRoles_societyId_fkey"
  foreign key ("societyId")
  references "public"."Societies"
  ("id") on update restrict on delete cascade;
