-- ================================================
-- RUN THIS SCRIPT DURING OFF-HOURS (requires table lock)
-- It converts PsProduct from a HEAP to a clustered table
-- which gives maximum performance for all queries.
-- ================================================
-- Estimated time: 2-5 minutes for 1.94M rows
-- ================================================

-- Step 1: Create clustered index on identity column
-- This physically reorders the table data for optimal reads
CREATE CLUSTERED INDEX CIX_PsProduct_ID ON PsProduct (id);

-- Step 2: (Optional) You can then drop the nonclustered IX_PsProduct_ID
-- since the clustered index now covers ID lookups
-- DROP INDEX IX_PsProduct_ID ON PsProduct;

PRINT 'Done! PsProduct is now a clustered table.';
