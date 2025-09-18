import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { spawn } from "child_process";

const serverPath = "./server_fixed.js";
const client = new Client({ name: "test-client", version: "1.0.0" });

async function main() {
  console.log("Connecting...");
  // Spawn server manually
  const child = spawn("node", [serverPath], {
    stdio: ["pipe", "pipe", "inherit"],
  });

  // Tap into raw stdout (server → client)
  child.stdout.on("data", (chunk) => {
    console.log("🔵 RAW SERVER → CLIENT:", chunk.toString());
  });

  const transport = new StdioClientTransport({
    command: "node",
    args: [serverPath],
  });

  await client.connect(transport);
  console.log("✅ Connected");

  // List tools
  const { tools } = await client.listTools();
  console.log(
    "Available tools:",
    tools.map((t) => t.name)
  );

  // intercption:
  const orignal = client.callTool.bind(client);
  client.callTool = async function (name, params) {
    console.log("invoked name:", name, params);
    return orignal(name, params);
  };

  // Call echo
  console.log("Calling echo...");
  const response = await client.callTool("ping", {
    random_string: "world",
  });
  console.log("Response:", JSON.stringify(response, null, 2));

  console.log("Calling read...");
  const resp = await client.callTool("readMSSQL", {
    random_string: "world",
  });
  console.log("Response:", JSON.stringify(resp, null, 2));

  await client.close();
}

main();
