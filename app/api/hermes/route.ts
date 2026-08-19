import { prisma } from "@/db/prisma";

// Hermes Protocol / Agent HTTP Route Handler
// Provides standard OpenAI / Hermes function execution & tool schema format

const HERMES_TOOLS = [
  {
    type: "function",
    function: {
      name: "get_customers",
      description: "List customers in the organization",
      parameters: {
        type: "object",
        properties: {
          organizationId: { type: "string", description: "Organization ID" },
          limit: { type: "number", description: "Limit number of records returned", default: 10 },
        },
        required: ["organizationId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_invoices",
      description: "List invoices for an organization",
      parameters: {
        type: "object",
        properties: {
          organizationId: { type: "string", description: "Organization ID" },
          status: { type: "string", description: "Filter status: DRAFT, SENT, PAID, OVERDUE, CANCELLED" },
          limit: { type: "number", description: "Limit number of records returned", default: 10 },
        },
        required: ["organizationId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_customer",
      description: "Create a new customer in FastKeep",
      parameters: {
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
  },
  {
    type: "function",
    function: {
      name: "get_financial_summary",
      description: "Get quick financial summary (total revenue, total pending, total expenses)",
      parameters: {
        type: "object",
        properties: {
          organizationId: { type: "string", description: "Organization ID" },
        },
        required: ["organizationId"],
      },
    },
  },
];

export async function GET() {
  return Response.json({
    name: "fastkeep-hermes-agent",
    description: "Hermes Agent tools integration for FastKeep",
    tools: HERMES_TOOLS,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tool, arguments: args } = body;

    // Handle tool registration inquiry
    if (body.action === "list_tools") {
      return Response.json({ tools: HERMES_TOOLS });
    }

    const organizationId = args?.organizationId;
    if (!organizationId) {
      return Response.json({ error: "organizationId argument is required" }, { status: 400 });
    }

    let result;
    if (tool === "get_customers") {
      result = await prisma.customer.findMany({
        where: { organizationId },
        take: args?.limit || 10,
        orderBy: { createdAt: "desc" },
      });
    } else if (tool === "get_invoices") {
      result = await prisma.invoice.findMany({
        where: {
          organizationId,
          ...(args?.status ? { status: args.status } : {}),
        },
        take: args?.limit || 10,
        include: { customer: true, items: true },
        orderBy: { date: "desc" },
      });
    } else if (tool === "create_customer") {
      result = await prisma.customer.create({
        data: {
          organizationId,
          name: args.name,
          email: args.email,
          phone: args.phone,
          notes: args.notes,
        },
      });
    } else if (tool === "get_financial_summary") {
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

      result = {
        totalBilled: totalInvoices._sum.total || 0,
        totalCollected: paidInvoices._sum.total || 0,
        totalExpenses: expenses._sum.amount || 0,
      };
    } else {
      return Response.json({ error: `Tool '${tool}' not found` }, { status: 404 });
    }

    return Response.json({ status: "success", tool, result });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
