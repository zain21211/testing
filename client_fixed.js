// client.js
// FIXED VERSION - Corrected server path and improved error handling
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const serverPath = "./server_fixed.js"; // FIXED: Point to the correct server file
const client = new Client({ name: "db-client", version: "1.0.0" });

async function main() {
  console.log("Attempting to connect to the server...");

  try {
    const transport = new StdioClientTransport({
      command: "node",
      args: [serverPath],
    });

    // FIXED: Add timeout and better error handling
    await Promise.race([
      client.connect(transport),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Connection timeout after 10 seconds")),
          10000
        )
      ),
    ]);

    console.log("✅ Connected to MCP server!");
    console.log("------------------------------------------");

    // 1. List all available tools
    console.log("1. Listing available tools...");
    const { tools } = await client.listTools();
    console.log(
      "✅ SUCCESS! Tools found:",
      tools.map((t) => t.name).join(", ")
    );
    console.log("------------------------------------------");

    // 2. Call the 'ping' tool using client.request()
    console.log("2. Calling the 'ping' tool...");
    const textToSummarize =
      "The Model Context Protocol is a lightweight RPC protocol.";

    const pingResponse = await client.request("tools/call", {
      name: "ping",
      arguments: { random_string: textToSummarize }, // FIXED: Use correct parameter name
    });
    console.log("✅ SUCCESS! Summary from 'ping' tool:");
    console.log(`   -> ${pingResponse.content[0].text}`);
    console.log("------------------------------------------");

    // 3. Call the 'readMSSQL' tool using client.request()
    console.log("3. Calling the 'readMSSQL' tool...");
    const readResponse = await client.request("tools/call", {
      name: "readMSSQL",
      arguments: {
        random_string: "SELECT TOP 2 * FROM INFORMATION_SCHEMA.TABLES",
      }, // FIXED: Use correct parameter name
    });
    console.log("✅ SUCCESS! Response from 'readMSSQL' tool:");
    console.log(readResponse.content[0].text);
    console.log("------------------------------------------");

    // 4. Call the 'writeMongo' tool using client.request()
    console.log("4. Calling the 'writeMongo' tool...");
    const writeResponse = await client.request("tools/call", {
      name: "writeMongo",
      arguments: {
        random_string: JSON.stringify({
          // FIXED: Use correct parameter name and format
          collection: "testLogs",
          doc: {
            timestamp: new Date().toISOString(),
            level: "info",
            message: "Client test successful",
          },
        }),
      },
    });
    console.log("✅ SUCCESS! Response from 'writeMongo' tool:");
    console.log(`   -> ${writeResponse.content[0].text}`);
    console.log("------------------------------------------");
  } catch (err) {
    console.error("\n❌ An error occurred during the client run:", err);
    console.error("Error details:", err.message);
  } finally {
    console.log("\nClient run finished.");
    // FIXED: Properly close the connection
    try {
      await client.close();
    } catch (e) {
      console.log("Connection already closed or error closing:", e.message);
    }
  }
}

main().catch(console.error);
