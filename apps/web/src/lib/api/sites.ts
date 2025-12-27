import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function getSites() {
  const session = await auth()
  if (!session?.user?.id) return []

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

  return memberships.flatMap((m) => m.organization.sites)
}

export async function getSite(siteId: string) {
  const session = await auth()
  if (!session?.user?.id) return null

  const site = await prisma.site.findUnique({
    where: { id: siteId },
    include: {
      organization: {
        include: {
          members: {
            where: { userId: session.user.id },
          },
        },
      },
    },
  })

  if (!site || site.organization.members.length === 0) {
    return null
  }

  return site
}

export async function createSite(data: {
  name: string
  domain: string
  organizationId: string
}) {
  const trackingId = `ih_${generateTrackingId()}`

  return prisma.site.create({
    data: {
      ...data,
      trackingId,
      allowedHosts: [data.domain],
    },
  })
}

export async function updateSite(
  siteId: string,
  data: Partial<{
    name: string
    domain: string
    allowedHosts: string[]
    isActive: boolean
    enableHeatmaps: boolean
    enableRecordings: boolean
    anonymizeIps: boolean
    respectDnt: boolean
    cookieConsentMode: string
    dataRetentionDays: number
  }>
) {
  return prisma.site.update({
    where: { id: siteId },
    data,
  })
}

export async function deleteSite(siteId: string) {
  return prisma.site.delete({
    where: { id: siteId },
  })
}

function generateTrackingId() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
  let result = ""
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}
