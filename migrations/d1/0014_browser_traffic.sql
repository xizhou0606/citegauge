CREATE TABLE browser_sites (
  domain TEXT PRIMARY KEY,
  last_seen INTEGER
);
CREATE TABLE browser_pageviews (
  domain TEXT NOT NULL,
  event_id TEXT NOT NULL,
  visitor TEXT NOT NULL,
  at INTEGER NOT NULL,
  PRIMARY KEY (domain, event_id)
);
CREATE INDEX browser_pageviews_time ON browser_pageviews(domain,at,visitor);
