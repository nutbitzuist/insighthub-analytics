import { Suspense } from "react";
import { SitesList } from "@/components/dashboard/sites-list";
import { QuickStats } from "@/components/dashboard/quick-stats";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of all your websites
          </p>
        </div>
        <Link href="/dashboard/sites/new">
          <Button>
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Website
          </Button>
        </Link>
      </div>

      {/* Quick Stats Across All Sites */}
      <Suspense fallback={<QuickStats.Skeleton />}>
        <QuickStats />
      </Suspense>

      {/* Sites List */}
      <Suspense fallback={<SitesList.Skeleton />}>
        <SitesList />
      </Suspense>
    </div>
  );
}
