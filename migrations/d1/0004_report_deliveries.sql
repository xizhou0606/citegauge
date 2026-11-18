CREATE TABLE report_deliveries (
  monitor TEXT NOT NULL REFERENCES monitors(id),
  platform TEXT NOT NULL,
  request_id TEXT NOT NULL,
  state TEXT NOT NULL CHECK(state IN ('sending','sent','unknown')),
  created_at INTEGER NOT NULL,
  PRIMARY KEY(monitor,platform,request_id)
);
