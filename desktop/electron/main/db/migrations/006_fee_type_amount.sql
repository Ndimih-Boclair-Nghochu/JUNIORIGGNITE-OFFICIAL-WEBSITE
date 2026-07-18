-- Each fee type carries the amount the school charges for it, so recording a
-- payment can pre-fill the expected amount (still editable for part-payments).
ALTER TABLE fee_types ADD COLUMN amount INTEGER NOT NULL DEFAULT 0;
