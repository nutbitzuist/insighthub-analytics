"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MousePointer2, ArrowDown, Search, Layers } from "lucide-react";

interface HeatmapPoint {
  x: number;
  y: number;
  value: number;
}

interface ScrollDepthData {
  depth: number;
  visitors: number;
  percentage: number;
}

interface ClickedElement {
  element_selector: string;
  element_text: string;
  click_count: number;
  unique_clickers: number;
}

export default function HeatmapsPage() {
  const params = useParams();
  const siteId = params.siteId as string;
  const [pageUrl, setPageUrl] = useState("");
  const [heatmapData, setHeatmapData] = useState<HeatmapPoint[]>([]);
  const [scrollData, setScrollData] = useState<ScrollDepthData[]>([]);
  const [clickedElements, setClickedElements] = useState<ClickedElement[]>([]);
  const [activeTab, setActiveTab] = useState<"clicks" | "scroll" | "elements">("clicks");
  const [loading, setLoading] = useState(false);

  async function loadHeatmapData() {
    if (!pageUrl) return;
    setLoading(true);

    try {
      const [clicksRes, scrollRes, elementsRes] = await Promise.all([
        fetch(`/api/sites/${siteId}/heatmaps/clicks?pageUrl=${encodeURIComponent(pageUrl)}`),
        fetch(`/api/sites/${siteId}/heatmaps/scroll?pageUrl=${encodeURIComponent(pageUrl)}`),
        fetch(`/api/sites/${siteId}/heatmaps/elements?pageUrl=${encodeURIComponent(pageUrl)}`),
      ]);

      const [clicksData, scrollDataRes, elementsData] = await Promise.all([
        clicksRes.json(),
        scrollRes.json(),
        elementsRes.json(),
      ]);

      setHeatmapData(clicksData.heatmap || []);
      setScrollData(scrollDataRes.scrollDepth || []);
      setClickedElements(elementsData.elements || []);
    } catch (error) {
      console.error("Failed to load heatmap data:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Heatmaps</h1>
        <p className="text-muted-foreground">Visualize user clicks and scroll behavior</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Page</CardTitle>
          <CardDescription>Enter the URL of the page you want to analyze</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="https://example.com/page"
                value={pageUrl}
                onChange={(e) => setPageUrl(e.target.value)}
              />
            </div>
            <Button onClick={loadHeatmapData} disabled={!pageUrl || loading}>
              {loading ? "Loading..." : "Load Heatmap"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button
          variant={activeTab === "clicks" ? "default" : "outline"}
          onClick={() => setActiveTab("clicks")}
        >
          <MousePointer2 className="h-4 w-4 mr-2" />
          Click Heatmap
        </Button>
        <Button
          variant={activeTab === "scroll" ? "default" : "outline"}
          onClick={() => setActiveTab("scroll")}
        >
          <ArrowDown className="h-4 w-4 mr-2" />
          Scroll Depth
        </Button>
        <Button
          variant={activeTab === "elements" ? "default" : "outline"}
          onClick={() => setActiveTab("elements")}
        >
          <Layers className="h-4 w-4 mr-2" />
          Clicked Elements
        </Button>
      </div>

      {activeTab === "clicks" && (
        <Card>
          <CardHeader>
            <CardTitle>Click Heatmap</CardTitle>
            <CardDescription>
              Visualize where users click on your page
            </CardDescription>
          </CardHeader>
          <CardContent>
            {heatmapData.length === 0 ? (
              <div className="text-center py-12">
                <MousePointer2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {pageUrl
                    ? "No click data available for this page"
                    : "Enter a page URL to view click heatmap"}
                </p>
              </div>
            ) : (
              <div className="relative bg-muted rounded-lg overflow-hidden" style={{ height: 600 }}>
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <p className="font-medium">Heatmap Visualization</p>
                    <p className="text-sm">{heatmapData.length} click points recorded</p>
                  </div>
                </div>
                {heatmapData.slice(0, 100).map((point, index) => (
                  <div
                    key={index}
                    className="absolute rounded-full"
                    style={{
                      left: `${(point.x / 1920) * 100}%`,
                      top: `${(point.y / 1080) * 100}%`,
                      width: Math.min(point.value * 5, 50),
                      height: Math.min(point.value * 5, 50),
                      background: `radial-gradient(circle, rgba(239, 68, 68, ${Math.min(point.value / 10, 0.8)}) 0%, transparent 70%)`,
                      transform: "translate(-50%, -50%)",
                    }}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "scroll" && (
        <Card>
          <CardHeader>
            <CardTitle>Scroll Depth</CardTitle>
            <CardDescription>
              See how far users scroll down your page
            </CardDescription>
          </CardHeader>
          <CardContent>
            {scrollData.length === 0 ? (
              <div className="text-center py-12">
                <ArrowDown className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {pageUrl
                    ? "No scroll data available for this page"
                    : "Enter a page URL to view scroll depth"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {[0, 25, 50, 75, 100].map((depth) => {
                  const data = scrollData.find((d) => d.depth === depth) || {
                    depth,
                    visitors: 0,
                    percentage: 0,
                  };
                  const color =
                    depth <= 25
                      ? "bg-green-500"
                      : depth <= 50
                      ? "bg-yellow-500"
                      : depth <= 75
                      ? "bg-orange-500"
                      : "bg-red-500";

                  return (
                    <div key={depth} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{depth}% of page</span>
                        <span className="font-medium">
                          {data.visitors.toLocaleString()} visitors ({data.percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="h-8 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${color} transition-all`}
                          style={{ width: `${data.percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "elements" && (
        <Card>
          <CardHeader>
            <CardTitle>Most Clicked Elements</CardTitle>
            <CardDescription>
              See which elements get the most clicks
            </CardDescription>
          </CardHeader>
          <CardContent>
            {clickedElements.length === 0 ? (
              <div className="text-center py-12">
                <Layers className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {pageUrl
                    ? "No element click data available"
                    : "Enter a page URL to view clicked elements"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {clickedElements.map((element, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm truncate">{element.element_selector}</p>
                      {element.element_text && (
                        <p className="text-sm text-muted-foreground truncate">
                          "{element.element_text}"
                        </p>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-bold">{element.click_count.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        {element.unique_clickers} unique
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
