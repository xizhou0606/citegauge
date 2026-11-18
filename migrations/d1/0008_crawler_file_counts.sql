CREATE TABLE crawler_requests (
  domain TEXT NOT NULL,
  request_id TEXT NOT NULL,
  at INTEGER NOT NULL,
  bot TEXT NOT NULL,
  host TEXT NOT NULL,
  path TEXT NOT NULL,
  status INTEGER NOT NULL,
  agent TEXT NOT NULL,
  PRIMARY KEY (domain, request_id, at, host, path)
);
INSERT INTO crawler_requests (domain, request_id, at, bot, host, path, status, agent)
  SELECT domain, request_id, at, bot, host, path, status, agent FROM crawler_visits;
DROP TABLE crawler_visits;
ALTER TABLE crawler_requests RENAME TO crawler_visits;
CREATE INDEX crawler_visits_domain_time ON crawler_visits(domain, at DESC, request_id);

CREATE TABLE crawler_log_days (
  domain TEXT NOT NULL,
  day INTEGER NOT NULL,
  first_seen INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  PRIMARY KEY (domain, day)
);
