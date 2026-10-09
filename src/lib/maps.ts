// Google Maps walking links. Uses the documented "Maps URLs" format with a
// text query (place name / address), never invented coordinates.
// encodeURIComponent gives %20 for spaces and UTF-8 percent-encoding for Hebrew.

export function walkingDirectionsUrl(destination: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=walking`
}
