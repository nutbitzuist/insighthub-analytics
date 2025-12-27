import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Globe } from "lucide-react"

interface CountriesMapProps {
  siteId: string
  period: string
}

export async function CountriesMap({ siteId, period }: CountriesMapProps) {
  // In a real implementation, this would fetch country data
  const countries: Array<{ code: string; name: string; visitors: number }> = []

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Countries</CardTitle>
      </CardHeader>
      <CardContent>
        {countries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Globe className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm">No geographic data yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {countries.slice(0, 10).map((country, i) => (
              <div key={country.code} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{getCountryFlag(country.code)}</span>
                  <span className="text-sm font-medium">{country.name}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {country.visitors.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function getCountryFlag(code: string): string {
  const codePoints = code
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0))
  return String.fromCodePoint(...codePoints)
}

CountriesMap.Skeleton = function CountriesMapSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 w-32 bg-muted animate-pulse rounded" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 bg-muted animate-pulse rounded" />
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              </div>
              <div className="h-4 w-12 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
