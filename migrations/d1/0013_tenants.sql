CREATE TABLE tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);
CREATE TABLE tenant_members (
  user_id TEXT PRIMARY KEY REFERENCES user(id) ON DELETE CASCADE,
  tenant TEXT NOT NULL REFERENCES tenants(id)
);
CREATE INDEX tenant_members_by_tenant ON tenant_members(tenant);
-- Each dedicated business database is claimed once, independently of its binding name.
CREATE TABLE tenant_database (
  singleton INTEGER PRIMARY KEY CHECK(singleton = 1),
  tenant TEXT NOT NULL
);
