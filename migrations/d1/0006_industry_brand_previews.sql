CREATE TABLE industry_brand_previews (
  brand TEXT NOT NULL,
  source TEXT NOT NULL,
  url TEXT NOT NULL,
  captured INTEGER NOT NULL,
  image TEXT NOT NULL,
  PRIMARY KEY (brand, source)
);
