CREATE TABLE sdk_sites (
  domain TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  last_seen INTEGER
);
CREATE TABLE sdk_pageviews (
  domain TEXT NOT NULL,
  event_id TEXT NOT NULL,
  at INTEGER NOT NULL,
  visitor TEXT NOT NULL,
  PRIMARY KEY(domain,event_id)
);
CREATE INDEX sdk_pageviews_domain_time ON sdk_pageviews(domain,at,visitor);
