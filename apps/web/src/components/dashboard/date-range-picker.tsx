"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Calendar, ChevronDown } from "lucide-react"

const periods = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_7_days", label: "Last 7 days" },
  { value: "last_30_days", label: "Last 30 days" },
]

interface DateRangePickerProps {
  period: string
}

export function DateRangePicker({ period }: DateRangePickerProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentPeriod = periods.find((p) => p.value === period) || periods[2]

  const handlePeriodChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("period", value)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-[180px] justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{currentPeriod.label}</span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[180px]">
        {periods.map((p) => (
          <DropdownMenuItem
            key={p.value}
            onClick={() => handlePeriodChange(p.value)}
            className={period === p.value ? "bg-accent" : ""}
          >
            {p.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
