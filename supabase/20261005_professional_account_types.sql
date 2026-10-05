-- Professional account model: ЛЯ Business + Organization Free
-- Applied to Supabase project nmeoakrpafxhpdrplsuo on 2026-10-05.

alter table public.business_accounts
  add column if not exists account_kind text not null default 'business',
  add column if not exists legal_status text not null default 'registered',
  add column if not exists inn text,
  add column if not exists ogrn text,
  add column if not exists registry_name text,
  add column if not exists registry_source text,
  add column if not exists registry_checked_at timestamptz;

alter table public.business_accounts
  drop constraint if exists business_accounts_account_kind_check,
  add constraint business_accounts_account_kind_check
    check (account_kind in ('business','organization')),
  drop constraint if exists business_accounts_legal_status_check,
  add constraint business_accounts_legal_status_check
    check (legal_status in ('registered','informal')),
  drop constraint if exists business_accounts_inn_check,
  add constraint business_accounts_inn_check
    check (inn is null or inn ~ '^[0-9]{10}$|^[0-9]{12}$'),
  drop constraint if exists business_accounts_ogrn_check,
  add constraint business_accounts_ogrn_check
    check (ogrn is null or ogrn ~ '^[0-9]{13}$|^[0-9]{15}$'),
  drop constraint if exists business_accounts_kind_legal_check,
  add constraint business_accounts_kind_legal_check
    check (account_kind <> 'business' or legal_status = 'registered');

create or replace function private.protect_business_account_system_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(current_setting('request.jwt.claim.role',true),'') <> 'service_role' then
    if new.owner_user_id is distinct from old.owner_user_id
       or new.verification_status is distinct from old.verification_status
       or new.subscription_tier is distinct from old.subscription_tier
       or new.subscription_status is distinct from old.subscription_status
       or new.account_kind is distinct from old.account_kind
       or new.legal_status is distinct from old.legal_status
       or new.inn is distinct from old.inn
       or new.ogrn is distinct from old.ogrn
       or new.registry_name is distinct from old.registry_name
       or new.registry_source is distinct from old.registry_source
       or new.registry_checked_at is distinct from old.registry_checked_at then
      raise exception 'system business fields can only be changed by the service';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_business_account_system_fields on public.business_accounts;
create trigger protect_business_account_system_fields
before update of owner_user_id, verification_status, subscription_tier, subscription_status,
  account_kind, legal_status, inn, ogrn, registry_name, registry_source, registry_checked_at
on public.business_accounts
for each row execute function private.protect_business_account_system_fields();

drop policy if exists business_accounts_public_read on public.business_accounts;
drop policy if exists business_accounts_auth_read on public.business_accounts;
create policy business_accounts_auth_read
on public.business_accounts
as permissive
for select
to authenticated
using (private.has_business_role(id, array['owner','admin','manager']));

drop policy if exists business_offerings_insert on public.business_offerings;
create policy business_offerings_insert
on public.business_offerings
as permissive
for insert
to authenticated
with check (
  private.has_business_role(business_id, array['owner','admin','manager'])
  and exists (
    select 1 from public.business_accounts b
    where b.id=business_offerings.business_id and b.account_kind='business'
  )
);

drop policy if exists business_offerings_update on public.business_offerings;
create policy business_offerings_update
on public.business_offerings
as permissive
for update
to authenticated
using (
  private.has_business_role(business_id, array['owner','admin','manager'])
  and exists (
    select 1 from public.business_accounts b
    where b.id=business_offerings.business_id and b.account_kind='business'
  )
)
with check (
  private.has_business_role(business_id, array['owner','admin','manager'])
  and exists (
    select 1 from public.business_accounts b
    where b.id=business_offerings.business_id and b.account_kind='business'
  )
);

drop policy if exists events_insert_creator on public.events;
create policy events_insert_creator
on public.events
as permissive
for insert
to authenticated
with check (
  creator_id = (select auth.uid())
  and (
    visibility <> 'public'
    or (
      business_id is not null
      and private.has_business_role(business_id, array['owner','admin','manager'])
      and exists (
        select 1 from public.business_accounts b
        where b.id=events.business_id
          and b.published=true
          and (
            b.verification_status='verified'
            or (b.account_kind='organization' and b.legal_status='informal')
          )
      )
    )
  )
);

drop policy if exists events_update_creator on public.events;
create policy events_update_creator
on public.events
as permissive
for update
to authenticated
using (creator_id = (select auth.uid()))
with check (
  creator_id = (select auth.uid())
  and (
    visibility <> 'public'
    or (
      business_id is not null
      and private.has_business_role(business_id, array['owner','admin','manager'])
      and exists (
        select 1 from public.business_accounts b
        where b.id=events.business_id
          and b.published=true
          and (
            b.verification_status='verified'
            or (b.account_kind='organization' and b.legal_status='informal')
          )
      )
    )
  )
);
