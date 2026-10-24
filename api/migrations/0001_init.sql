-- Messages from the contact form, kept 90 days so none is lost if its email fails.
CREATE TABLE messages (
  id INTEGER PRIMARY KEY,
  received_at TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  country TEXT,
  emailed INTEGER NOT NULL DEFAULT 0
);

-- One row per page event, kept 30 days. No IP address is ever stored: `visitor` is a hash of the IP, the
-- browser and the site, mixed with a salt that is destroyed when its day ends, so it only tells visitors apart
-- within one day.
CREATE TABLE events (
  id INTEGER PRIMARY KEY,
  at TEXT NOT NULL,
  day TEXT NOT NULL,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  referrer TEXT,
  source TEXT,
  medium TEXT,
  campaign TEXT,
  ref TEXT,
  country TEXT,
  device TEXT,
  browser TEXT,
  os TEXT,
  lang TEXT,
  width TEXT,
  asn INTEGER,
  network TEXT,
  visitor TEXT NOT NULL,
  duration INTEGER,
  detail TEXT
);
CREATE INDEX events_day ON events (day);

-- Daily totals by one dimension at a time (path, country, referrer, ref, device, browser, network, or 'all'),
-- kept 25 months; network names 12 months.
CREATE TABLE daily (
  day TEXT NOT NULL,
  dimension TEXT NOT NULL,
  value TEXT NOT NULL,
  views INTEGER NOT NULL,
  visitors INTEGER NOT NULL,
  PRIMARY KEY (day, dimension, value)
);
