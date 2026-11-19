ALTER TABLE browser_pageviews ADD COLUMN device TEXT
  CHECK (device IN ('desktop','phone','tablet','unknown'));
