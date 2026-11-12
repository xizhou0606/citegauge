CREATE TABLE monitors (
  id text PRIMARY KEY,
  config jsonb NOT NULL,
  due double precision NOT NULL DEFAULT 0,
  sequence bigint GENERATED ALWAYS AS IDENTITY
);
CREATE INDEX monitor_schedule ON monitors(due) WHERE due>0;
CREATE TABLE runs (
  id text PRIMARY KEY,
  monitor text NOT NULL REFERENCES monitors(id),
  at double precision NOT NULL,
  state text NOT NULL CHECK (state IN ('pending','ok','failed')),
  detail jsonb NOT NULL DEFAULT '{}',
  raw text NOT NULL DEFAULT ''
);
CREATE INDEX history ON runs(monitor,at DESC,id DESC);
CREATE TABLE screenshots (
  run text PRIMARY KEY REFERENCES runs(id),
  mime text NOT NULL,
  bytes bytea NOT NULL
);
