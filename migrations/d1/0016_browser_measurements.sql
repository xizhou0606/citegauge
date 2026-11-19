ALTER TABLE browser_pageviews ADD COLUMN device_sampled INTEGER NOT NULL DEFAULT 1;
CREATE TABLE browser_measurements (
  domain TEXT NOT NULL,
  event_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  label TEXT NOT NULL,
  amount REAL NOT NULL,
  at INTEGER NOT NULL,
  PRIMARY KEY(domain,event_id,kind,label)
);
CREATE INDEX browser_measurements_range ON browser_measurements(domain,at);
CREATE INDEX browser_visitor_history ON browser_pageviews(domain,visitor,at);
