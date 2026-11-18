CREATE TABLE crawler_visits (
  domain TEXT NOT NULL,
  request_id TEXT NOT NULL,
  at INTEGER NOT NULL,
  bot TEXT NOT NULL,
  host TEXT NOT NULL,
  path TEXT NOT NULL,
  status INTEGER NOT NULL,
  agent TEXT NOT NULL,
  PRIMARY KEY (domain, request_id)
);
CREATE INDEX crawler_visits_domain_time ON crawler_visits(domain, at DESC, request_id);
