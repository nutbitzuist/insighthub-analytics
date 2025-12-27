"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Check, Copy } from "lucide-react"

interface TrackingCodeSnippetProps {
  trackingId: string
}

export function TrackingCodeSnippet({ trackingId }: TrackingCodeSnippetProps) {
  const [copied, setCopied] = useState(false)

  const snippet = `<!-- InsightHub Analytics -->
<script>
  (function(i,n,s,h,u,b){i['InsightHubObject']=u;i[u]=i[u]||function(){
  (i[u].q=i[u].q||[]).push(arguments)};i[u].l=1*new Date();b=n.createElement(s);
  b.async=1;b.src=h;n.head.appendChild(b)
  })(window,document,'script','https://cdn.insighthub.io/v1/ih.js','insighthub');
  
  insighthub('init', '${trackingId}');
</script>
<!-- End InsightHub Analytics -->`

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(snippet)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-sm">
          <code>{snippet}</code>
        </pre>
        <Button
          size="sm"
          variant="outline"
          className="absolute top-2 right-2"
          onClick={copyToClipboard}
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 mr-1" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </>
          )}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Add this code to the <code className="bg-muted px-1 rounded">&lt;head&gt;</code> section of your website.
      </p>
    </div>
  )
}
