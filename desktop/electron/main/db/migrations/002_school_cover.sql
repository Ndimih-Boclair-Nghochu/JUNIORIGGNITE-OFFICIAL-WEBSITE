-- Extra school fields used by the printable Student Profile (report-card cover):
-- an "about the school" blurb, the postal box, and the village/town line.
ALTER TABLE schools ADD COLUMN po_box TEXT;
ALTER TABLE schools ADD COLUMN village_town TEXT;
ALTER TABLE schools ADD COLUMN about_text TEXT;
