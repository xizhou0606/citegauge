INSERT INTO monitors(id, config, due)
SELECT replace(m.id, '-v6-', '-v7-'),
       json_set(m.config,
         '$.id', replace(m.id, '-v6-', '-v7-'),
         '$.model', 'qwen3.7-flash',
         '$.brandPrompt.version', 7,
         '$.brandPrompt.previousMonitor', CASE
           WHEN EXISTS (SELECT 1 FROM runs WHERE monitor=m.id AND state='ok') THEN m.id
           ELSE m.config->>'$.brandPrompt.previousMonitor' END),
       m.due
FROM monitors AS m
WHERE m.config->>'$.brandPrompt.version' = 6 AND m.config->>'channel' = '通义千问 API'
  AND m.id LIKE '%-probe-%-v6-%' AND m.config->>'model' = 'qwen-flash'
  AND EXISTS (SELECT 1 FROM website_reports
              WHERE domain=m.config->>'domain' AND report->>'at'=m.config->>'$.brandPrompt.at')
ON CONFLICT(id) DO NOTHING;
