-- Reuse the same ranked question under a new monitor so evidence stays attributable to its model.
INSERT INTO monitors(id, config, due)
SELECT replace(id, '-v5-', '-v6-'),
       json_set(config,
         '$.id', replace(id, '-v5-', '-v6-'),
         '$.model', 'qwen-flash',
         '$.brandPrompt.version', 6,
         '$.brandPrompt.previousMonitor', id),
       due
FROM monitors
WHERE config->>'$.brandPrompt.version' = 5 AND config->>'channel' = '通义千问 API'
  AND id LIKE '%-probe-%-v5-%' AND config->>'model' = 'qwen-plus'
  AND EXISTS (SELECT 1 FROM website_reports
              WHERE domain = monitors.config->>'domain' AND report->>'at' = monitors.config->>'$.brandPrompt.at')
ON CONFLICT(id) DO NOTHING;
