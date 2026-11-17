CREATE TABLE monitors (
  sequence INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  config TEXT NOT NULL CHECK(json_valid(config)),
  due INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX monitor_schedule ON monitors(due) WHERE due>0;
CREATE TABLE runs (
  id TEXT PRIMARY KEY NOT NULL,
  monitor TEXT NOT NULL REFERENCES monitors(id),
  at INTEGER NOT NULL,
  state TEXT NOT NULL CHECK(state IN ('pending','ok','failed')),
  detail TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(detail)),
  raw TEXT NOT NULL DEFAULT ''
);
CREATE INDEX history ON runs(monitor,at DESC,id DESC);
CREATE INDEX interrupted ON runs(at) WHERE state='pending';
CREATE TABLE screenshots (
  run TEXT PRIMARY KEY NOT NULL REFERENCES runs(id),
  mime TEXT NOT NULL,
  bytes BLOB NOT NULL
);
