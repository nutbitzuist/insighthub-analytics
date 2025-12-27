import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createSiteSchema = z.object({
  name: z.string().min(1).max(100),
  domain: z.string().min(1).max(255),
})

function generateTrackingId() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
  let result = ""
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `ih_${result}`
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const memberships = await prisma.organizationMember.findMany({
      where: { userId: session.user.id },
      include: {
        organization: {
          include: {
            sites: true,
          },
        },
      },
    })

    const sites = memberships.flatMap((m) => m.organization.sites)
    return NextResponse.json(sites)
  } catch (error) {
    console.error("Error fetching sites:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { name, domain } = createSiteSchema.parse(body)

    // Get user's organization
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      include: { organization: true },
    })

    if (!membership) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 400 }
      )
    }

    // Check if domain already exists
    const existingSite = await prisma.site.findFirst({
      where: { domain, organizationId: membership.organizationId },
    })

    if (existingSite) {
      return NextResponse.json(
        { error: "Domain already exists in your organization" },
        { status: 400 }
      )
    }

    // Create site
    const site = await prisma.site.create({
      data: {
        name,
        domain: domain.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, ""),
        trackingId: generateTrackingId(),
        organizationId: membership.organizationId,
        allowedHosts: [domain.toLowerCase()],
      },
    })

    return NextResponse.json(site, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error creating site:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
