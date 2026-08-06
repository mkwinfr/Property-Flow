import { afterEach, describe, expect, it } from "vitest";
import type Database from "better-sqlite3";
import { openDatabase } from "../db/database.js";
import { loadMakeReadyPdfRecord, makeReadyPdfFilename, renderMakeReadyPdf } from "./pdf.js";

let database: Database.Database | undefined;
afterEach(() => database?.close());

describe("completed Make Ready PDF records", () => {
  it("rejects exports before manager approval", () => {
    database = openDatabase(":memory:");
    expect(() => loadMakeReadyPdfRecord("turn-202", database)).toThrow(
      "The Make Ready PDF is available after manager approval",
    );
  });

  it("renders an approved record as a downloadable PDF", async () => {
    database = openDatabase(":memory:");
    const approvedAt = "2026-08-04T15:30:00.000Z";
    database.prepare(
      `UPDATE turns SET status = 'complete', actual_ready_date = '2026-08-04',
       approved_by_user_id = 'user-manager', approved_at = ?, updated_at = ?
       WHERE id = 'turn-302'`,
    ).run(approvedAt, approvedAt);
    database.prepare(
      `UPDATE turn_items SET review_status = CASE WHEN status = 'complete' THEN 'passed' ELSE NULL END,
       reviewed_by_user_id = CASE WHEN status = 'complete' THEN 'user-manager' ELSE NULL END,
       reviewed_at = CASE WHEN status = 'complete' THEN ? ELSE NULL END
       WHERE turn_id = 'turn-302'`,
    ).run(approvedAt);

    const record = loadMakeReadyPdfRecord("turn-302", database, "2026-08-04T16:00:00.000Z");
    const pdf = await renderMakeReadyPdf(record);
    const recordWithoutActivity = structuredClone(record);
    recordWithoutActivity.turn.activity = [];
    const pdfWithoutActivity = await renderMakeReadyPdf(recordWithoutActivity);

    expect(record.turn.status).toBe("complete");
    expect(record.turn.approvedByName).toBeTruthy();
    expect(record.header.propertyName).toBe("Juniper Ridge");
    expect(makeReadyPdfFilename(record)).toBe("make-ready-jnr-unit-302-2026-08-04.pdf");
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(5_000);
    expect(pdf.toString("latin1").trimEnd().endsWith("%%EOF")).toBe(true);
    expect(pdf.equals(pdfWithoutActivity)).toBe(true);
  });
});
