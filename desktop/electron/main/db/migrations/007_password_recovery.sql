-- Offline password recovery. The app has no internet or email, so an admin who
-- forgets their password proves ownership with a security question chosen at
-- setup. Only the bcrypt hash of the answer is stored.
ALTER TABLE admins ADD COLUMN security_question TEXT;
ALTER TABLE admins ADD COLUMN security_answer_hash TEXT;
