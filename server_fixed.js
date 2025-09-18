// server.js
// CORRECTED VERSION - Fixed implementation issues
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import sql from "mssql";
import { MongoClient, ObjectId } from "mongodb";
import { ar } from "zod/v4/locales";
// import { ok } from "@modelcontextprotocol/sdk/server/responses.js";
console.error("MODERN SERVER: Process started.");

// --- DB CONFIG AND CONNECTIONS ---
const mssqlConfig = {
  user: "sa",
  password: "Ahmad",
  server: "100.72.169.90",
  database: "ahmadinternational",
  options: { encrypt: false, trustServerCertificate: true },
};
const mongoUri = "mongodb://localhost:27017";
const mongoDbName = "test";
let mssqlPool;
let mongoClient;

async function initDatabases() {
  try {
    mssqlPool = await sql.connect(mssqlConfig);
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    console.error("✅ Connected to MSSQL & MongoDB");
  } catch (err) {
    console.error("❌ Database connection error:", err);
    process.exit(1);
  }
}

// --- MCP SERVER ---
const server = new McpServer({
  name: "llm-server",
  version: "1.0.0",
  // handlers: {
  //   "tools/call": async (args) => {
  //     console.error(`SERVER: Routing call for tool '${args.name}'`);
  //     return server.callTool(args.name, args.arguments);
  //   },
  // },
});

// --- INTERCEPT ALL REQUESTS ---
// --- INTERCEPT TOOL CALLS ---

// 1. DEFINE your tools using registerTool - Updated to work with MCP client
server.tool(
  "ping",
  z.object({ random_string: z.string() }),
  async ({ random_string }) => {
    // Handle both JSON string and plain text
    let text = random_string;
    try {
      const parsed = JSON.parse(random_string);
      if (parsed.text) {
        text = parsed.text;
      }
    } catch (e) {
      // If not JSON, use the string directly
      text = random_string;
    }

    const summary = `Summary of "${text}": This is a test summary. The original text was: ${text}`;
    return {
      content: [
        {
          type: "text",
          text: summary,
        },
      ],
    };
  }
);

// Read tool
server.tool(
  "readMSSQL",
  z.object({
    random_string: z.string(),
  }),
  async ({ random_string }) => {
    console.error(
      "✅ readMSSQL tool called with random_string:",
      random_string
    );

    try {
      // Execute the SQL query
      const result = await mssqlPool.request().query(random_string);

      return {
        content: [
          {
            type: "text",
            text: `Query result: ${JSON.stringify(result.recordset)}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error executing query: ${error.message}`,
          },
        ],
      };
    }
  }
);
// server.registerTool(
//   "writeMongo",
//   z.object({ random_string: z.string() }).describe("Write to MongoDB"),
//   async ({ random_string }) => {
//     try {
//       // Parse the JSON string to get collection and doc
//       let collection, doc;
//       try {
//         const parsed = JSON.parse(random_string);
//         collection = parsed.collection || "test_collection";
//         doc = parsed.doc || { test: "default document", timestamp: new Date() };
//       } catch (e) {
//         // If not JSON, create a default document
//         collection = "test_collection";
//         doc = { message: random_string, timestamp: new Date() };
//       }

//       // FIXED: Ensure document has _id if not provided
//       if (!doc._id) {
//         doc._id = new ObjectId();
//       }

//       const result = await mongoClient
//         .db(mongoDbName)
//         .collection(collection)
//         .insertOne(doc);
//       return ok([
//         {
//           type: "text",
//           text: `✅ Mongo write successful. Inserted ID: ${result.insertedId}`,
//         },
//       ]);
//     } catch (error) {
//       return {
//         content: [{ type: "text", text: `Error: ${error.message}` }],
//       };
//     }
//   }
// );

// --- START THE SERVER ---
async function startServer() {
  try {
    const transport = new StdioServerTransport();
    await initDatabases();
    await server.connect(transport);
    console.error("MODERN SERVER: Ready and connected.");
  } catch (error) {
    console.error("❌ Server startup error:", error);
    process.exit(1);
  }
}

startServer();
