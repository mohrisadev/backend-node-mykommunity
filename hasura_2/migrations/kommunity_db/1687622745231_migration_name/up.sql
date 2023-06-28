SET check_function_bodies = false;
CREATE FUNCTION public.generate_uuid_v4() RETURNS uuid
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN uuid_generate_v4();
END;
$$;
CREATE FUNCTION public."set_current_timestamp_updatedAt"() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  _new record;
BEGIN
  _new := NEW;
  _new."updatedAt" = NOW();
  RETURN _new;
END;
$$;
CREATE TABLE public."Accounts" (
    "bankName" text NOT NULL,
    "accountNumber" text NOT NULL,
    "ifscCode" text,
    "accountHolderName" text,
    "createdAt" timestamp with time zone DEFAULT now(),
    "updatedAt" timestamp with time zone DEFAULT now(),
    disabled boolean DEFAULT false,
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL
);
CREATE TABLE public."ChargetList" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "chargeName" text NOT NULL,
    "accountId" uuid NOT NULL,
    account text,
    "chartOfAccountId" uuid NOT NULL,
    "chargeData" jsonb NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now(),
    "updatedAt" timestamp with time zone DEFAULT now()
);
CREATE TABLE public."ChartOfAccount" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "accountName" text NOT NULL,
    "cashAcount" text NOT NULL,
    "transactionAccount" text NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "generalLedgerID" uuid
);
CREATE TABLE public."GeneralLedger" (
    "generalLedgerName" text NOT NULL,
    "subCatagory" text NOT NULL,
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now(),
    "updatedAt" timestamp with time zone DEFAULT now(),
    disabled boolean DEFAULT false NOT NULL
);
CREATE TABLE public."RentalSetup" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "flatId" text NOT NULL,
    area text NOT NULL,
    credit text NOT NULL,
    debit text NOT NULL,
    "houseType" text NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."SocityBudget" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "budgetName" text NOT NULL,
    "financialYear" text NOT NULL,
    "budgetPeriod" text NOT NULL,
    "budgetReport" jsonb NOT NULL
);
CREATE TABLE public."TransactionDetails" (
    "transactionId" uuid DEFAULT public.gen_random_uuid() NOT NULL,
    "transactionDate" timestamp with time zone NOT NULL,
    "fromAccount" text NOT NULL,
    "toAccount" text NOT NULL,
    "chequeDate" date NOT NULL,
    "chequeNumber" text NOT NULL,
    description text NOT NULL,
    reference text NOT NULL,
    amount double precision DEFAULT 0 NOT NULL,
    type text NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    credit boolean DEFAULT false,
    debit boolean DEFAULT false
);
CREATE TABLE public."VendorBookings" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "vendorId" uuid NOT NULL,
    "invoiceNumber" text NOT NULL,
    "billDate" date NOT NULL,
    "expensionCreationDate" date NOT NULL,
    "dueDate" date NOT NULL,
    "itemDetails" jsonb NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."Vendors" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "vendorName" text NOT NULL,
    pan text NOT NULL,
    mobile text NOT NULL,
    email text NOT NULL,
    "bankAccount" text NOT NULL,
    "gstNumber" text NOT NULL,
    "accountBranch" text NOT NULL,
    "ifscCode" text NOT NULL,
    address text NOT NULL,
    department text NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    disabled boolean DEFAULT false NOT NULL
);
ALTER TABLE ONLY public."Accounts"
    ADD CONSTRAINT "Accounts_accountNumber_key" UNIQUE ("accountNumber");
ALTER TABLE ONLY public."Accounts"
    ADD CONSTRAINT "Accounts_pkey" PRIMARY KEY ("accountNumber", id);
ALTER TABLE ONLY public."ChargetList"
    ADD CONSTRAINT "ChargetList_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public."ChartOfAccount"
    ADD CONSTRAINT "ChartOfAccount_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public."GeneralLedger"
    ADD CONSTRAINT "GeneralLedger_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public."SocityBudget"
    ADD CONSTRAINT "SocityBudget_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public."TransactionDetails"
    ADD CONSTRAINT "TransactionDetails_pkey" PRIMARY KEY ("transactionId");
ALTER TABLE ONLY public."VendorBookings"
    ADD CONSTRAINT "VendorBookings_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public."Vendors"
    ADD CONSTRAINT "Vendors_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public."RentalSetup"
    ADD CONSTRAINT "rentalSetup_pkey" PRIMARY KEY (id);
CREATE TRIGGER "set_public_Accounts_updatedAt" BEFORE UPDATE ON public."Accounts" FOR EACH ROW EXECUTE FUNCTION public."set_current_timestamp_updatedAt"();
COMMENT ON TRIGGER "set_public_Accounts_updatedAt" ON public."Accounts" IS 'trigger to set value of column "updatedAt" to current timestamp on row update';
CREATE TRIGGER "set_public_ChargetList_updatedAt" BEFORE UPDATE ON public."ChargetList" FOR EACH ROW EXECUTE FUNCTION public."set_current_timestamp_updatedAt"();
COMMENT ON TRIGGER "set_public_ChargetList_updatedAt" ON public."ChargetList" IS 'trigger to set value of column "updatedAt" to current timestamp on row update';
CREATE TRIGGER "set_public_ChartOfAccount_updatedAt" BEFORE UPDATE ON public."ChartOfAccount" FOR EACH ROW EXECUTE FUNCTION public."set_current_timestamp_updatedAt"();
COMMENT ON TRIGGER "set_public_ChartOfAccount_updatedAt" ON public."ChartOfAccount" IS 'trigger to set value of column "updatedAt" to current timestamp on row update';
CREATE TRIGGER "set_public_GeneralLedger_updatedAt" BEFORE UPDATE ON public."GeneralLedger" FOR EACH ROW EXECUTE FUNCTION public."set_current_timestamp_updatedAt"();
COMMENT ON TRIGGER "set_public_GeneralLedger_updatedAt" ON public."GeneralLedger" IS 'trigger to set value of column "updatedAt" to current timestamp on row update';
CREATE TRIGGER "set_public_TransactionDetails_updatedAt" BEFORE UPDATE ON public."TransactionDetails" FOR EACH ROW EXECUTE FUNCTION public."set_current_timestamp_updatedAt"();
COMMENT ON TRIGGER "set_public_TransactionDetails_updatedAt" ON public."TransactionDetails" IS 'trigger to set value of column "updatedAt" to current timestamp on row update';
CREATE TRIGGER "set_public_VendorBookings_updatedAt" BEFORE UPDATE ON public."VendorBookings" FOR EACH ROW EXECUTE FUNCTION public."set_current_timestamp_updatedAt"();
COMMENT ON TRIGGER "set_public_VendorBookings_updatedAt" ON public."VendorBookings" IS 'trigger to set value of column "updatedAt" to current timestamp on row update';
CREATE TRIGGER "set_public_Vendors_updatedAt" BEFORE UPDATE ON public."Vendors" FOR EACH ROW EXECUTE FUNCTION public."set_current_timestamp_updatedAt"();
COMMENT ON TRIGGER "set_public_Vendors_updatedAt" ON public."Vendors" IS 'trigger to set value of column "updatedAt" to current timestamp on row update';
CREATE TRIGGER "set_public_rentalSetup_updatedAt" BEFORE UPDATE ON public."RentalSetup" FOR EACH ROW EXECUTE FUNCTION public."set_current_timestamp_updatedAt"();
COMMENT ON TRIGGER "set_public_rentalSetup_updatedAt" ON public."RentalSetup" IS 'trigger to set value of column "updatedAt" to current timestamp on row update';
