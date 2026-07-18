-- The principal's name, printed under the PRINCIPAL signature line on report
-- cards. Editable from Settings; blank simply leaves the signature line empty.
ALTER TABLE schools ADD COLUMN principal_name TEXT;
