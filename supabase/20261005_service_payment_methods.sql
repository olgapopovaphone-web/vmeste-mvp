-- Service payment methods for ЛЯ Business.
-- Applied to Supabase project nmeoakrpafxhpdrplsuo on 2026-10-05.

alter table public.business_offerings
  add column if not exists payment_method text,
  add column if not exists payment_url text;

alter table public.business_offerings
  drop constraint if exists business_offerings_payment_method_check,
  add constraint business_offerings_payment_method_check
    check (
      payment_method is null
      or payment_method in ('onsite','online_link','contact')
    );

alter table public.business_offerings
  drop constraint if exists business_offerings_payment_url_check,
  add constraint business_offerings_payment_url_check
    check (payment_url is null or payment_url ~* '^https?://');
