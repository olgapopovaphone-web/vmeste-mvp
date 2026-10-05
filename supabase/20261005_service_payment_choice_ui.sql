-- Simplify service online payment to a UI choice only.
-- Applied to Supabase project nmeoakrpafxhpdrplsuo on 2026-10-05.
-- No payment provider is connected in this step.

update public.business_offerings
set payment_method='online'
where payment_method='online_link';

alter table public.business_offerings
  drop constraint if exists business_offerings_payment_method_check,
  add constraint business_offerings_payment_method_check
    check (payment_method is null or payment_method in ('onsite','online','contact'));
