import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { prisma } from "@/db/prisma";

// Helper function to build MCP Server instance
function createVinBookMCPServer() {
  const server = new Server(
    {
      name: "vinbook-mcp",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "get_customers",
          description: "List customers in the organization",
          inputSchema: {
            type: "object",
            properties: {
              organizationId: { type: "string", description: "Organization ID" },
              limit: { type: "number", description: "Limit number of records returned", default: 10 },
            },
            required: ["organizationId"],
          },
        },
        {
          name: "get_invoices",
          description: "List invoices for an organization",
          inputSchema: {
            type: "object",
            properties: {
              organizationId: { type: "string", description: "Organization ID" },
              status: { type: "string", description: "Filter by status: DRAFT, SENT, PAID, OVERDUE, CANCELLED" },
              limit: { type: "number", description: "Limit number of records returned", default: 10 },
            },
            required: ["organizationId"],
          },
        },
        {
          name: "create_customer",
          description: "Create a new customer in VinBook",
          inputSchema: {
            type: "object",
            properties: {
              organizationId: { type: "string", description: "Organization ID" },
              name: { type: "string", description: "Customer Name" },
              email: { type: "string", description: "Customer Email" },
              phone: { type: "string", description: "Customer Phone" },
              notes: { type: "string", description: "Optional notes" },
            },
            required: ["organizationId", "name"],
          },
        },
        {
          name: "get_financial_summary",
          description: "Get quick financial summary (total revenue, total pending, total expenses)",
          inputSchema: {
            type: "object",
            properties: {
              organizationId: { type: "string", description: "Organization ID" },
            },
            required: ["organizationId"],
          },
        },
      ],
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const organizationId = (args as any)?.organizationId;

    if (!organizationId) {
      throw new Error("organizationId argument is required");
    }

    try {
      if (name === "get_customers") {
        const limit = (args as any)?.limit || 10;
        const customers = await prisma.customer.findMany({
          where: { organizationId },
          take: limit,
          orderBy: { createdAt: "desc" },
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(customers, null, 2),
            },
          ],
        };
      }

      if (name === "get_invoices") {
        const limit = (args as any)?.limit || 10;
        const status = (args as any)?.status;
        const invoices = await prisma.invoice.findMany({
          where: {
            organizationId,
            ...(status ? { status: status as any } : {}),
          },
          take: limit,
          include: { customer: true, items: true },
          orderBy: { date: "desc" },
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(invoices, null, 2),
            },
          ],
        };
      }

      if (name === "create_customer") {
        const { name: customerName, email, phone, notes } = args as any;
        const newCustomer = await prisma.customer.create({
          data: {
            organizationId,
            name: customerName,
            email,
            phone,
            notes,
          },
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(newCustomer, null, 2),
            },
          ],
        };
      }

      if (name === "get_financial_summary") {
        const totalInvoices = await prisma.invoice.aggregate({
          where: { organizationId },
          _sum: { total: true },
        });
        const paidInvoices = await prisma.invoice.aggregate({
          where: { organizationId, status: "PAID" },
          _sum: { total: true },
        });
        const expenses = await prisma.expense.aggregate({
          where: { organizationId },
          _sum: { amount: true },
        });

        const summary = {
          totalBilled: totalInvoices._sum.total || 0,
          totalCollected: paidInvoices._sum.total || 0,
          totalExpenses: expenses._sum.amount || 0,
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(summary, null, 2),
            },
          ],
        };
      }

      throw new Error(`Unknown tool: ${name}`);
    } catch (err: any) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error executing tool ${name}: ${err.message}`,
          },
        ],
      };
    }
  });

  return server;
}

// Next.js Route Handlers (Web standard Request/Response)
export async function GET(req: Request) {
  let transport: SSEServerTransport;
  
  const stream = new ReadableStream({
    start(controller) {
      const res = {
        writeHead(status: number, headers: Record<string, string>) {
          // Headers handled by Next.js Response object
        },
        write(chunk: any) {
          controller.enqueue(typeof chunk === "string" ? new TextEncoder().encode(chunk) : chunk);
          return true;
        },
        end() {
          controller.close();
        },
        on(event: string, listener: () => void) {},
      } as any;

      transport = new SSEServerTransport("/api/mcp/message", res);
      const server = createVinBookMCPServer();
      server.connect(transport).catch((err) => controller.error(err));
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

export async function POST(req: Request) {
  const body = await req.json();

  if (body.method === "tools/list") {
    const server = createVinBookMCPServer();
    return Response.json({
      jsonrpc: "2.0",
      id: body.id,
      result: {
        tools: [
          {
            name: "get_customers",
            description: "List customers in the organization",
            inputSchema: {
              type: "object",
              properties: {
                organizationId: { type: "string" },
                limit: { type: "number", default: 10 },
              },
              required: ["organizationId"],
            },
          },
          {
            name: "get_invoices",
            description: "List invoices for an organization",
            inputSchema: {
              type: "object",
              properties: {
                organizationId: { type: "string" },
                status: { type: "string" },
                limit: { type: "number", default: 10 },
              },
              required: ["organizationId"],
            },
          },
          {
            name: "create_customer",
            description: "Create a new customer in VinBook",
            inputSchema: {
              type: "object",
              properties: {
                organizationId: { type: "string" },
                name: { type: "string" },
                email: { type: "string" },
                phone: { type: "string" },
                notes: { type: "string" },
              },
              required: ["organizationId", "name"],
            },
          },
          {
            name: "get_financial_summary",
            description: "Get quick financial summary",
            inputSchema: {
              type: "object",
              properties: {
                organizationId: { type: "string" },
              },
              required: ["organizationId"],
            },
          },
        ],
      },
    });
  }

  if (body.method === "tools/call") {
    const { name, arguments: args } = body.params || {};
    const organizationId = args?.organizationId;

    if (!organizationId) {
      return Response.json({
        jsonrpc: "2.0",
        id: body.id,
        error: { code: -32602, message: "organizationId argument is required" },
      });
    }

    try {
      let resultText = "";
      if (name === "get_customers") {
        const customers = await prisma.customer.findMany({
          where: { organizationId },
          take: args?.limit || 10,
          orderBy: { createdAt: "desc" },
        });
        resultText = JSON.stringify(customers, null, 2);
      } else if (name === "get_invoices") {
        const invoices = await prisma.invoice.findMany({
          where: {
            organizationId,
            ...(args?.status ? { status: args.status as any } : {}),
          },
          take: args?.limit || 10,
          include: { customer: true, items: true },
          orderBy: { date: "desc" },
        });
        resultText = JSON.stringify(invoices, null, 2);
      } else if (name === "create_customer") {
        const newCustomer = await prisma.customer.create({
          data: {
            organizationId,
            name: args.name,
            email: args.email,
            phone: args.phone,
            notes: args.notes,
          },
        });
        resultText = JSON.stringify(newCustomer, null, 2);
      } else if (name === "get_financial_summary") {
        const totalInvoices = await prisma.invoice.aggregate({
          where: { organizationId },
          _sum: { total: true },
        });
        const paidInvoices = await prisma.invoice.aggregate({
          where: { organizationId, status: "PAID" },
          _sum: { total: true },
        });
        const expenses = await prisma.expense.aggregate({
          where: { organizationId },
          _sum: { amount: true },
        });
        resultText = JSON.stringify({
          totalBilled: totalInvoices._sum.total || 0,
          totalCollected: paidInvoices._sum.total || 0,
          totalExpenses: expenses._sum.amount || 0,
        }, null, 2);
      } else {
        return Response.json({
          jsonrpc: "2.0",
          id: body.id,
          error: { code: -32601, message: `Tool not found: ${name}` },
        });
      }

      return Response.json({
        jsonrpc: "2.0",
        id: body.id,
        result: {
          content: [{ type: "text", text: resultText }],
        },
      });
    } catch (err: any) {
      return Response.json({
        jsonrpc: "2.0",
        id: body.id,
        error: { code: -32603, message: err.message },
      });
    }
  }

  return Response.json({
    jsonrpc: "2.0",
    id: body.id,
    result: { message: "VinBook MCP JSON-RPC Server" },
  });
}
