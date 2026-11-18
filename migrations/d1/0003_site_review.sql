CREATE TABLE latest_site_review (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  started INTEGER NOT NULL,
  report TEXT NOT NULL
);
