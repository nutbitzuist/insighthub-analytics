import { Reader, CityResponse } from "maxmind";
import UAParser from "ua-parser-js";
import { v4 as uuidv4 } from "uuid";
import type { RawEvent, EnrichedEvent } from "@shared/types";

// MaxMind reader (initialized on first use)
let geoReader: Reader<CityResponse> | null = null;

async function getGeoReader(): Promise<Reader<CityResponse> | null> {
  if (geoReader) return geoReader;

  try {
    const maxmind = await import("maxmind");
    geoReader = await maxmind.open<CityResponse>(
      process.env.MAXMIND_DB_PATH || "./GeoLite2-City.mmdb"
    );
    return geoReader;
  } catch (error) {
    console.warn("MaxMind database not available:", error);
    return null;
  }
}

interface RawEventInput {
  name: string;
  timestamp: number;
  properties?: Record<string, any>;
  context?: {
    viewport_width?: number;
    viewport_height?: number;
    screen_width?: number;
    screen_height?: number;
    timezone?: string;
    language?: string;
  };
  site_id: string;
  session_id: string;
  visitor_id: string;
  is_new_session: boolean;
  is_new_visitor: boolean;
  client_ip: string;
  user_agent: string;
}

export async function enrichEvent(input: RawEventInput): Promise<EnrichedEvent> {
  const ua = new UAParser(input.user_agent);
  const browser = ua.getBrowser();
  const os = ua.getOS();
  const device = ua.getDevice();

  // Determine device type
  let deviceType = "desktop";
  if (device.type === "mobile") deviceType = "mobile";
  else if (device.type === "tablet") deviceType = "tablet";

  // Geo lookup (don't store IP)
  let country = "";
  let region = "";
  let city = "";

  const geo = await getGeoReader();
  if (geo && input.client_ip) {
    try {
      const lookup = geo.get(input.client_ip);
      if (lookup) {
        country = lookup.country?.iso_code || "";
        region = lookup.subdivisions?.[0]?.iso_code || "";
        city = lookup.city?.names?.en || "";
      }
    } catch {
      // Ignore geo lookup errors
    }
  }

  // Extract UTM parameters from properties
  const props = input.properties || {};
  const utm = {
    source: props.utm_source || null,
    medium: props.utm_medium || null,
    campaign: props.utm_campaign || null,
    term: props.utm_term || null,
    content: props.utm_content || null,
  };

  // Determine channel group
  const channelGroup = determineChannelGroup(
    utm.source,
    utm.medium,
    props.referrer
  );

  // Parse page data
  const pageUrl = props.url || "";
  const pagePath = props.path || new URL(pageUrl || "http://x").pathname;
  const pageTitle = props.title || "";
  const referrer = props.referrer || "";

  return {
    event_id: uuidv4(),
    site_id: input.site_id,
    visitor_id: input.visitor_id,
    session_id: input.session_id,

    event_name: input.name,
    event_properties: JSON.stringify(props),

    page_url: pageUrl,
    page_path: pagePath,
    page_title: pageTitle,
    page_referrer: referrer,

    utm_source: utm.source,
    utm_medium: utm.medium,
    utm_campaign: utm.campaign,
    utm_term: utm.term,
    utm_content: utm.content,
    channel_group: channelGroup,

    browser: browser.name || "Unknown",
    browser_version: browser.version || "",
    os: os.name || "Unknown",
    os_version: os.version || "",
    device_type: deviceType,

    screen_width: input.context?.screen_width || 0,
    screen_height: input.context?.screen_height || 0,
    viewport_width: input.context?.viewport_width || 0,
    viewport_height: input.context?.viewport_height || 0,

    country_code: country,
    region: region,
    city: city,
    timezone: input.context?.timezone || "",
    language: input.context?.language || "",

    timestamp: new Date(input.timestamp),
    is_new_visitor: input.is_new_visitor ? 1 : 0,
    is_new_session: input.is_new_session ? 1 : 0,

    // Heatmap fields (null if not a heatmap event)
    heatmap_x: null,
    heatmap_y: null,
    scroll_depth: null,
  };
}

function determineChannelGroup(
  source: string | null,
  medium: string | null,
  referrer: string | null
): string {
  // Direct traffic
  if (!source && !medium && !referrer) {
    return "Direct";
  }

  // Paid search
  if (medium === "cpc" || medium === "ppc" || medium === "paid") {
    return "Paid Search";
  }

  // Organic search
  const searchEngines = ["google", "bing", "yahoo", "duckduckgo", "baidu"];
  if (
    medium === "organic" ||
    (source && searchEngines.some((se) => source.toLowerCase().includes(se)))
  ) {
    return "Organic Search";
  }

  // Social
  const socialPlatforms = [
    "facebook",
    "twitter",
    "linkedin",
    "instagram",
    "tiktok",
    "youtube",
    "reddit",
    "pinterest",
  ];
  if (
    medium === "social" ||
    (source && socialPlatforms.some((sp) => source.toLowerCase().includes(sp)))
  ) {
    return "Social";
  }

  // Email
  if (medium === "email") {
    return "Email";
  }

  // Referral
  if (referrer && medium !== "none") {
    return "Referral";
  }

  return "Other";
}
