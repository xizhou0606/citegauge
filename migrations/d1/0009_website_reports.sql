CREATE TABLE website_reports (
  domain TEXT PRIMARY KEY,
  started INTEGER NOT NULL,
  report TEXT NOT NULL
);
WITH legacy AS (
  SELECT started, report, lower(substr(report->>'url', instr(report->>'url','://') + 3)) AS address
  FROM latest_site_review
), hosts AS (
  SELECT *, substr(address, 1, instr(address || '/', '/') - 1) AS host FROM legacy
)
INSERT INTO website_reports(domain,started,report)
SELECT coalesce(report->>'$.monitor.domain', iif(host LIKE 'www.%', substr(host,5),host)), started, report FROM hosts
WHERE coalesce(report->>'$.monitor.domain',host) IS NOT NULL;
CREATE TABLE website_question_jobs (
  domain TEXT PRIMARY KEY,
  revision INTEGER NOT NULL,
  due INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0
);
INSERT INTO website_question_jobs(domain, revision, due)
SELECT domain, report->>'at', 1 FROM website_reports WHERE json_type(report,'$.monitor')='object';
