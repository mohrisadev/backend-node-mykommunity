alter table "public"."Complaints"
  add constraint "Complaints_categoryId_fkey"
  foreign key ("categoryId")
  references "public"."ComplaintCategories"
  ("id") on update restrict on delete restrict;
