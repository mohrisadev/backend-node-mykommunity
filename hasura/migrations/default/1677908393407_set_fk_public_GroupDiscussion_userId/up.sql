alter table "public"."GroupDiscussion"
  add constraint "GroupDiscussion_userId_fkey"
  foreign key ("userId")
  references "public"."Users"
  ("id") on update restrict on delete cascade;
