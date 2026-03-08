// tests/updateInvoice.test.js
//
// Unit tests for the optimized updateInvoice controller.
// Uses Jest mocks to avoid hitting the real MSSQL database.
// Tests verify:
//   1. Correct batching behavior (single query per batch, not per item)
//   2. Proper JSON payload construction
//   3. Edge cases (empty arrays, missing dateTime, mixed items)
//   4. Error handling
//   5. Response format

// ---- Mock setup ----
const mockQuery = jest.fn().mockResolvedValue({ recordset: [] });
const mockInput = jest.fn().mockReturnThis();
const mockRequest = jest.fn(() => ({
  input: mockInput,
  query: mockQuery,
}));
const mockPool = { request: mockRequest };

// Mock the database connection module
jest.mock("../database/connection", () => {
  return jest.fn().mockResolvedValue(mockPool);
});

// Mock mssql types
jest.mock("mssql", () => ({
  Int: "Int",
  Float: "Float",
  VarChar: "VarChar",
  NVarChar: "NVarChar",
  DateTime: "DateTime",
  MAX: "MAX",
  NVarChar: jest.fn((size) => ({ type: "NVarChar", size })),
}));

const invoiceControllers = require("../controllers/invoiceControllers");

// ---- Helper to create mock req/res ----
function createMockReqRes(body = {}) {
  const req = { body, params: {}, query: {} };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return { req, res };
}

// ---- Tests ----
describe("updateInvoice - Optimized Batch Queries", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-setup mockInput to return `this` for chaining
    mockInput.mockReturnThis();
    mockQuery.mockResolvedValue({ recordset: [] });
  });

  // ==========================================================
  // 1. BATCHING: Should make exactly 1 DB call for N empty items
  // ==========================================================
  describe("Batch 1: Zero-quantity items", () => {
    it("should batch all zero-qty items into a single OPENJSON query", async () => {
      const { req, res } = createMockReqRes({
        invoice: 1001,
        updatedInvoice: [
          { psid: 10, qty: "0", dateTime: "2026-03-08 12:00", user: "zain" },
          { psid: 11, qty: "0", dateTime: "2026-03-08 12:00", user: "zain" },
          { psid: 12, qty: "0", dateTime: "2026-03-08 12:00", user: "zain" },
        ],
        nug: "5",
        time: "2026-03-08 12:00",
        acid: 100,
      });

      await invoiceControllers.updateInvoice(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Invoice update completed",
          emptyItemsCount: 3,
          changedItemsCount: 0,
        })
      );

      // 1 call for empty batch + 1 for PSDetail update + 1 for Ledgers update = 3 total
      // (NOT 3 + 2 = 5 like the old code would do)
      expect(mockRequest).toHaveBeenCalledTimes(3);

      // The first query should contain OPENJSON (batch query)
      const firstQueryCall = mockQuery.mock.calls[0][0];
      expect(firstQueryCall).toContain("OPENJSON");
      expect(firstQueryCall).toContain("QTY = 0");
    });

    it("should skip empty items with missing dateTime", async () => {
      const { req, res } = createMockReqRes({
        invoice: 1001,
        updatedInvoice: [
          { psid: 10, qty: "0", dateTime: null, user: "zain" },
          { psid: 11, qty: "0", dateTime: "2026-03-08 12:00", user: "zain" },
        ],
        nug: "5",
        time: "2026-03-08 12:00",
        acid: 100,
      });

      await invoiceControllers.updateInvoice(req, res);

      expect(res.status).toHaveBeenCalledWith(200);

      // Check the JSON payload only contains the item with dateTime
      const inputCalls = mockInput.mock.calls;
      const jsonInput = inputCalls.find(
        (call) => call[0] === "ItemsJson"
      );
      if (jsonInput) {
        const payload = JSON.parse(jsonInput[2]);
        expect(payload).toHaveLength(1);
        expect(payload[0].psid).toBe(11);
      }
    });

    it("should not fire empty-batch query when no zero-qty items exist", async () => {
      const { req, res } = createMockReqRes({
        invoice: 1001,
        updatedInvoice: [
          { psid: 10, qty: "5", prid: 1, dateTime: "2026-03-08 12:00", user: "zain" },
        ],
        nug: "5",
        time: "2026-03-08 12:00",
        acid: 100,
      });

      await invoiceControllers.updateInvoice(req, res);

      // Only 3 calls: changed-items batch + PSDetail + Ledgers
      // The first query should be the changed-items batch (InputItems CTE), not the empty-items one
      const firstQueryCall = mockQuery.mock.calls[0][0];
      expect(firstQueryCall).toContain("InputItems");
      expect(firstQueryCall).not.toContain("QTY = 0, SchPc = 0, VEST = 0");
    });
  });

  // ==========================================================
  // 2. BATCHING: Should make exactly 1 DB call for N changed items
  // ==========================================================
  describe("Batch 2: Changed-quantity items", () => {
    it("should batch all changed items into a single OPENJSON query with CTE", async () => {
      const { req, res } = createMockReqRes({
        invoice: 2001,
        updatedInvoice: [
          { psid: 20, qty: "10", prid: 100, dateTime: "2026-03-08 14:00", user: "ali" },
          { psid: 21, qty: "5", prid: 101, dateTime: "2026-03-08 14:00", user: "ali" },
          { psid: 22, qty: "8", prid: 102, dateTime: "2026-03-08 14:00", user: "ali" },
          { psid: 23, qty: "3", prid: 103, dateTime: "2026-03-08 14:00", user: "ali" },
          { psid: 24, qty: "15", prid: 104, dateTime: "2026-03-08 14:00", user: "ali" },
        ],
        nug: "7",
        time: "2026-03-08 14:00",
        acid: 200,
      });

      await invoiceControllers.updateInvoice(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          changedItemsCount: 5,
          emptyItemsCount: 0,
        })
      );

      // 1 call for changed batch + 1 for PSDetail + 1 for Ledgers = 3 total
      // OLD code would have been 5 + 2 = 7 calls
      expect(mockRequest).toHaveBeenCalledTimes(3);

      // The first query should be the CTE-based batch query
      const firstQueryCall = mockQuery.mock.calls[0][0];
      expect(firstQueryCall).toContain("InputItems");
      expect(firstQueryCall).toContain("OPENJSON");
      expect(firstQueryCall).toContain("SchQTYSlabs");
    });

    it("should include correct JSON payload with prid, qty, user, dt", async () => {
      const { req, res } = createMockReqRes({
        invoice: 2001,
        updatedInvoice: [
          { psid: 20, qty: "10", prid: 100, dateTime: "2026-03-08 14:00", user: "ali" },
        ],
        nug: "7",
        time: "2026-03-08 14:00",
        acid: 200,
      });

      await invoiceControllers.updateInvoice(req, res);

      // Find the ItemsJson input call
      const jsonInput = mockInput.mock.calls.find(
        (call) => call[0] === "ItemsJson"
      );
      expect(jsonInput).toBeDefined();

      const payload = JSON.parse(jsonInput[2]);
      expect(payload).toHaveLength(1);
      expect(payload[0]).toEqual(
        expect.objectContaining({
          psid: 20,
          prid: 100,
          qty: "10",
          user: "ali",
        })
      );
      // dt should be a valid ISO datetime string
      expect(new Date(payload[0].dt).toISOString()).toBe(payload[0].dt);
    });

    it("should warn and skip changed items with missing dateTime", async () => {
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      const { req, res } = createMockReqRes({
        invoice: 2001,
        updatedInvoice: [
          { psid: 20, qty: "10", prid: 100, dateTime: null, user: "ali" },
          { psid: 21, qty: "5", prid: 101, dateTime: "2026-03-08 14:00", user: "ali" },
        ],
        nug: "7",
        time: "2026-03-08 14:00",
        acid: 200,
      });

      await invoiceControllers.updateInvoice(req, res);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Missing dateTime for item with psid: 20")
      );

      // Check that only the valid item is in the JSON payload
      const jsonInput = mockInput.mock.calls.find(
        (call) => call[0] === "ItemsJson"
      );
      if (jsonInput) {
        const payload = JSON.parse(jsonInput[2]);
        expect(payload).toHaveLength(1);
        expect(payload[0].psid).toBe(21);
      }

      consoleSpy.mockRestore();
    });
  });

  // ==========================================================
  // 3. MIXED: Both empty and changed items in one call
  // ==========================================================
  describe("Mixed items (empty + changed)", () => {
    it("should process both batches with exactly 2 batch queries + 2 final queries", async () => {
      const { req, res } = createMockReqRes({
        invoice: 3001,
        updatedInvoice: [
          { psid: 30, qty: "0", dateTime: "2026-03-08 10:00", user: "zain" },
          { psid: 31, qty: "0", dateTime: "2026-03-08 10:00", user: "zain" },
          { psid: 32, qty: "12", prid: 200, dateTime: "2026-03-08 10:00", user: "zain" },
          { psid: 33, qty: "7", prid: 201, dateTime: "2026-03-08 10:00", user: "zain" },
        ],
        nug: "3",
        time: "2026-03-08 10:00",
        acid: 300,
      });

      await invoiceControllers.updateInvoice(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          emptyItemsCount: 2,
          changedItemsCount: 2,
        })
      );

      // 1 for empty batch + 1 for changed batch + 1 PSDetail + 1 Ledgers = 4
      // OLD code: 2 + 2 + 2 = 6 sequential calls
      expect(mockRequest).toHaveBeenCalledTimes(4);
    });
  });

  // ==========================================================
  // 4. CONSTANT TIME: Verify query count does NOT scale with items
  // ==========================================================
  describe("Constant time verification", () => {
    it("should use same number of DB calls for 1 item and 50 items", async () => {
      // Test with 1 changed item
      const { req: req1, res: res1 } = createMockReqRes({
        invoice: 4001,
        updatedInvoice: [
          { psid: 40, qty: "5", prid: 300, dateTime: "2026-03-08 10:00", user: "test" },
        ],
        nug: "1",
        time: "2026-03-08 10:00",
        acid: 400,
      });

      await invoiceControllers.updateInvoice(req1, res1);
      const callsWith1Item = mockRequest.mock.calls.length;

      // Reset mocks
      jest.clearAllMocks();
      mockInput.mockReturnThis();
      mockQuery.mockResolvedValue({ recordset: [] });

      // Test with 50 changed items
      const items50 = Array.from({ length: 50 }, (_, i) => ({
        psid: 100 + i,
        qty: String(i + 1),
        prid: 500 + i,
        dateTime: "2026-03-08 10:00",
        user: "test",
      }));

      const { req: req50, res: res50 } = createMockReqRes({
        invoice: 4002,
        updatedInvoice: items50,
        nug: "1",
        time: "2026-03-08 10:00",
        acid: 400,
      });

      await invoiceControllers.updateInvoice(req50, res50);
      const callsWith50Items = mockRequest.mock.calls.length;

      // CRITICAL ASSERTION: Both should use the SAME number of DB calls
      expect(callsWith1Item).toBe(callsWith50Items);
      // Both should be exactly 3 (batch + PSDetail + Ledgers)
      expect(callsWith1Item).toBe(3);
      expect(callsWith50Items).toBe(3);
    });
  });

  // ==========================================================
  // 5. ERROR HANDLING
  // ==========================================================
  describe("Error handling", () => {
    it("should return 500 with sqlError on database failure", async () => {
      mockQuery.mockRejectedValueOnce(new Error("OPENJSON parsing failed"));

      const { req, res } = createMockReqRes({
        invoice: 5001,
        updatedInvoice: [
          { psid: 50, qty: "0", dateTime: "2026-03-08 10:00", user: "zain" },
        ],
        nug: "1",
        time: "2026-03-08 10:00",
        acid: 500,
      });

      await invoiceControllers.updateInvoice(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Internal server error",
          sqlError: "OPENJSON parsing failed",
        })
      );
    });
  });

  // ==========================================================
  // 6. PSDetail & Ledger final updates
  // ==========================================================
  describe("PSDetail and Ledger updates", () => {
    it("should always run PSDetail and Ledger updates after batches", async () => {
      const { req, res } = createMockReqRes({
        invoice: 6001,
        updatedInvoice: [
          { psid: 60, qty: "5", prid: 600, dateTime: "2026-03-08 10:00", user: "admin" },
        ],
        nug: "2",
        time: "2026-03-08 10:00",
        acid: 600,
      });

      await invoiceControllers.updateInvoice(req, res);

      // Check that the DOC parameter is passed to PSDetail update
      const docInputs = mockInput.mock.calls.filter(
        (call) => call[0] === "DOC"
      );
      expect(docInputs.length).toBeGreaterThanOrEqual(2); // once for PSDetail, once for Ledgers
      expect(docInputs[0][2]).toBe(6001);

      // Check Ledger update query runs
      const lastQuery = mockQuery.mock.calls[mockQuery.mock.calls.length - 1][0];
      expect(lastQuery).toContain("Ledgers");
    });

    it("should pass nug as integer to PSDetail update", async () => {
      const { req, res } = createMockReqRes({
        invoice: 6002,
        updatedInvoice: [],
        nug: "42",
        time: "2026-03-08 10:00",
        acid: 600,
      });

      await invoiceControllers.updateInvoice(req, res);

      const nugInput = mockInput.mock.calls.find(
        (call) => call[0] === "NUG"
      );
      expect(nugInput).toBeDefined();
      expect(nugInput[2]).toBe(42); // should be parsed to int
    });
  });

  // ==========================================================
  // 7. DATETIME OFFSET
  // ==========================================================
  describe("DateTime +5h offset", () => {
    it("should apply +5 hours offset to all datetimes in the payload", async () => {
      const { req, res } = createMockReqRes({
        invoice: 7001,
        updatedInvoice: [
          { psid: 70, qty: "0", dateTime: "2026-03-08 07:00", user: "zain" },
        ],
        nug: "1",
        time: "2026-03-08 07:00",
        acid: 700,
      });

      await invoiceControllers.updateInvoice(req, res);

      // Find the JSON payload for the empty items batch
      const jsonInput = mockInput.mock.calls.find(
        (call) => call[0] === "ItemsJson"
      );
      expect(jsonInput).toBeDefined();

      const payload = JSON.parse(jsonInput[2]);
      const dtDate = new Date(payload[0].dt);
      // Original 07:00 local + 5h = 12:00 local
      // (Note: new Date("2026-03-08T07:00") parses as local time)
      expect(dtDate.getHours()).toBe(12);
    });
  });
});
