alter table private.app_secrets enable row level security;

-- No browser-facing policies are intentional. The service_role used by the
-- server bypasses RLS; anon and authenticated roles have no schema or table
-- grants and cannot call the secret RPCs.
