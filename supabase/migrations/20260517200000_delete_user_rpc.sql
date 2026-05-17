-- GDPR right-to-be-forgotten: a user-callable RPC that deletes the
-- caller's auth.users row. The existing ON DELETE CASCADE chain
-- (profiles → workspaces → channel_accounts / conversations /
-- messages / contacts / tasks / events / workspace_members) then
-- wipes every byte that belongs to the user, including their
-- encrypted Gmail tokens.
--
-- SECURITY DEFINER is required because auth.users isn't writable
-- by the authenticated role directly — only the supabase_auth_admin
-- role can delete from it. We restrict the function to deleting the
-- caller's own row (auth.uid()) so it can't be abused to delete
-- anyone else.
create or replace function public.delete_user()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  caller uuid;
begin
  caller := auth.uid();
  if caller is null then
    raise exception 'must be authenticated';
  end if;

  -- The cascade chain (profiles → workspaces → everything) wipes the
  -- rest. We just need this single delete on auth.users.
  delete from auth.users where id = caller;
end;
$$;

-- Authenticated users only. Anon must NOT be able to call this.
revoke all on function public.delete_user() from public, anon;
grant execute on function public.delete_user() to authenticated;
