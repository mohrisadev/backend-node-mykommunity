alter table "public"."UserRoles"
  add constraint "UserRoles_guardGateId_fkey"
  foreign key ("guardGateId")
  references "public"."Gates"
  ("id") on update restrict on delete restrict;
