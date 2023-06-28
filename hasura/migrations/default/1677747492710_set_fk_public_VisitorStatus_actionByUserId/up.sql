alter table "public"."VisitorStatus"
  add constraint "VisitorStatus_actionByUserId_fkey"
  foreign key ("actionByUserId")
  references "public"."Users"
  ("id") on update restrict on delete cascade;
