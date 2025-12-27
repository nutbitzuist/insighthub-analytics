"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"

export default function NewSitePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    const name = formData.get("name") as string
    const domain = formData.get("domain") as string

    try {
      const res = await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, domain }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to create site")
        setIsLoading(false)
        return
      }

      const site = await res.json()
      router.push(`/dashboard/${site.id}`)
    } catch {
      setError("Something went wrong")
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href="/dashboard"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Dashboard
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Add a new website</CardTitle>
          <CardDescription>
            Enter your website details to start tracking analytics
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="p-3 mb-4 text-sm text-destructive bg-destructive/10 rounded-md">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Website Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="My Awesome Website"
                required
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                A friendly name to identify your website
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="domain">Domain</Label>
              <Input
                id="domain"
                name="domain"
                type="text"
                placeholder="example.com"
                required
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                The domain of your website (without http:// or https://)
              </p>
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Link href="/dashboard">
                <Button type="button" variant="outline" disabled={isLoading}>
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Website
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
