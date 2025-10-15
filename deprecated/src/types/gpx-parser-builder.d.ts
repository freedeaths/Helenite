declare module 'gpx-parser-builder' {
  export interface GPXTrackPoint {
    lat: number;
    lng: number;
    ele?: number;
    time?: string;
  }

  export interface GPXTrack {
    name?: string;
    desc?: string;
    segments: GPXTrackPoint[][];
  }

  export interface GPXWaypoint {
    lat: number;
    lng: number;
    name?: string;
    desc?: string;
    ele?: number;
  }

  export interface GPXData {
    tracks: GPXTrack[];
    waypoints: GPXWaypoint[];
    routes: any[];
    trk?: GPXTrack[]; // Alternative property name
    metadata?: {
      name?: string;
      desc?: string;
      time?: string;
    };
  }

  interface GPXParser {
    parseGpx(gpxString: string): GPXData;
    default?: GPXParser;
  }

  const GPX: GPXParser & {
    parse(gpxString: string): GPXData;
    parseGpx(gpxString: string): GPXData;
    createGPX(tracks: GPXTrack[], waypoints?: GPXWaypoint[], options?: any): string;
    default: GPXParser;
  };

  export default GPX;
}