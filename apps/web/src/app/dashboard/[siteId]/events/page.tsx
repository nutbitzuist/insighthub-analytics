"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Zap, Search, TrendingUp, Users, Calendar } from "lucide-react";

interface EventSummary {
  event_name: string;
  count: number;
  unique_visitors: number;
  unique_sessions: number;
}

interface EventDetail {
  event_name: string;
  event_properties: string;
  visitor_id: string;
  session_id: string;
  timestamp: string;
}

export default function EventsPage() {
  const params = useParams();
  const siteId = params.siteId as string;
  const [summary, setSummary] = useState<EventSummary[]>([]);
  const [events, setEvents] = useState<EventDetail[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEventSummary();
  }, [siteId]);

  useEffect(() => {
    if (selectedEvent) {
      fetchEventDetails(selectedEvent);
    }
  }, [selectedEvent]);

  async function fetchEventSummary() {
    try {
      const res = await fetch(`/api/sites/${siteId}/events/summary`);
      const data = await res.json();
      setSummary(data.events || []);
    } catch (error) {
      console.error("Failed to fetch event summary:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchEventDetails(eventName: string) {
    try {
      const res = await fetch(
        `/api/sites/${siteId}/events?eventName=${encodeURIComponent(eventName)}&limit=50`
      );
      const data = await res.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error("Failed to fetch event details:", error);
    }
  }

  const filteredSummary = summary.filter((event) =>
    event.event_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Custom Events</h1>
        <p className="text-muted-foreground">Track and analyze custom events from your site</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search events..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredSummary.length === 0 ? (
        <Card className="p-12 text-center">
          <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No custom events yet</h3>
          <p className="text-muted-foreground mb-4">
            Start tracking custom events using the tracking script
          </p>
          <pre className="bg-muted p-4 rounded-lg text-left text-sm overflow-x-auto">
            {`// Track a custom event
insighthub.track('button_click', {
  button_id: 'signup',
  page: '/pricing'
});`}
          </pre>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1 space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Event Types ({filteredSummary.length})
            </h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredSummary.map((event) => (
                <Card
                  key={event.event_name}
                  className={`p-3 cursor-pointer transition-colors ${
                    selectedEvent === event.event_name
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => setSelectedEvent(event.event_name)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      <span className="font-medium truncate">{event.event_name}</span>
                    </div>
                    <span className="text-sm font-bold">{event.count.toLocaleString()}</span>
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {event.unique_visitors} visitors
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedEvent ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-500" />
                    <CardTitle>{selectedEvent}</CardTitle>
                  </div>
                  <CardDescription>Recent occurrences of this event</CardDescription>
                </CardHeader>
                <CardContent>
                  {events.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No recent events found
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {events.map((event, index) => (
                        <div
                          key={index}
                          className="flex items-start justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              <span>
                                {new Date(event.timestamp).toLocaleString()}
                              </span>
                            </div>
                            {event.event_properties && event.event_properties !== "{}" && (
                              <pre className="text-xs bg-background p-2 rounded mt-2 overflow-x-auto">
                                {JSON.stringify(JSON.parse(event.event_properties), null, 2)}
                              </pre>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground font-mono">
                            {event.visitor_id.substring(0, 8)}...
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="p-12 text-center">
                <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Select an event</h3>
                <p className="text-muted-foreground">
                  Choose an event from the list to view its details
                </p>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
