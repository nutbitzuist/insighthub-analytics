import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getSite } from "@/lib/api/sites";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { VisitorsChart } from "@/components/charts/visitors-chart";
import { SourcesTable } from "@/components/dashboard/sources-table";
import { PagesTable } from "@/components/dashboard/pages-table";
import { CountriesMap } from "@/components/charts/countries-map";
import { DevicesChart } from "@/components/charts/devices-chart";
import { RealTimeWidget } from "@/components/dashboard/realtime-widget";

interface SitePageProps {
  params: { siteId: string };
  searchParams: { period?: string; start?: string; end?: string };
}

export default async function SitePage({ params, searchParams }: SitePageProps) {
  const site = await getSite(params.siteId);

  if (!site) {
    notFound();
  }

  const period = searchParams.period || "last_7_days";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{site.name}</h1>
          <p className="text-muted-foreground">{site.domain}</p>
        </div>
        <div className="flex items-center gap-4">
          <RealTimeWidget siteId={site.id} />
          <DateRangePicker period={period} />
        </div>
      </div>

      {/* Stats Cards */}
      <Suspense fallback={<StatsCards.Skeleton />}>
        <StatsCards siteId={site.id} period={period} />
      </Suspense>

      {/* Main Chart */}
      <Suspense fallback={<VisitorsChart.Skeleton />}>
        <VisitorsChart siteId={site.id} period={period} />
      </Suspense>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sources */}
        <Suspense fallback={<SourcesTable.Skeleton />}>
          <SourcesTable siteId={site.id} period={period} />
        </Suspense>

        {/* Pages */}
        <Suspense fallback={<PagesTable.Skeleton />}>
          <PagesTable siteId={site.id} period={period} />
        </Suspense>
      </div>

      {/* Geographic & Devices */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<CountriesMap.Skeleton />}>
          <CountriesMap siteId={site.id} period={period} />
        </Suspense>

        <Suspense fallback={<DevicesChart.Skeleton />}>
          <DevicesChart siteId={site.id} period={period} />
        </Suspense>
      </div>
    </div>
  );
}
