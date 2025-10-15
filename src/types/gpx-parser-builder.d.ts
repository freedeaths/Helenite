declare module 'gpx-parser-builder' {
  interface GPXParser {
    parseGpx?(content: string): unknown;
    parse?(content: string): unknown;
    (content: string): unknown;
  }

  const gpxParser: GPXParser;
  export default gpxParser;
}
