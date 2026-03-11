CREATE TABLE briefings (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  ticker VARCHAR(10) NOT NULL,
  sector VARCHAR(255) NOT NULL,
  analyst_name VARCHAR(255) NOT NULL,
  summary TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  html_content TEXT,
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_briefings_company_name ON briefings(company_name);
CREATE INDEX idx_briefings_ticker ON briefings(ticker);

CREATE TABLE briefing_key_points (
  id SERIAL PRIMARY KEY,
  briefing_id INTEGER NOT NULL REFERENCES briefings(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_briefing_key_points_briefing_id ON briefing_key_points(briefing_id);

CREATE TABLE briefing_risks (
  id SERIAL PRIMARY KEY,
  briefing_id INTEGER NOT NULL REFERENCES briefings(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_briefing_risks_briefing_id ON briefing_risks(briefing_id);

CREATE TABLE briefing_metrics (
  id SERIAL PRIMARY KEY,
  briefing_id INTEGER NOT NULL REFERENCES briefings(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  value VARCHAR(255) NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_briefing_metrics_briefing_id ON briefing_metrics(briefing_id);
CREATE UNIQUE INDEX idx_briefing_metrics_unique ON briefing_metrics(briefing_id, name);
