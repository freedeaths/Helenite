import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import gpxParser from 'gpx-parser-builder';
import L from 'leaflet';

import 'leaflet/dist/leaflet.css';

interface GPXMapProps {
  code: string;
  isFile?: boolean;
  className?: string;
}

interface GPXTrack {
  name?: string;
  coordinates: [number, number][];
  waypoints: Array<{
    lat: number;
    lon: number;
    name?: string;
    description?: string;
  }>;
}

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export function GPXMap({ code, isFile = false, className = '' }: GPXMapProps) {
  const [track, setTrack] = useState<GPXTrack | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const parseGPX = async () => {
      try {
        if (!isMounted) return;
        setIsLoading(true);
        setError(null);

        // Get GPX content - either directly or from file
        let gpxContent = code;
        
        if (isFile) {
          // Convert file path to accessible URL
          // Handle @Publish/... paths and convert to relative URLs
          let filePath = code;
          if (filePath.startsWith('@Publish/')) {
            filePath = filePath.replace('@Publish/', '/src/../../../Publish/');
          }
          
          console.log('Loading GPX file from:', filePath);
          
          try {
            const response = await fetch(filePath);
            if (!response.ok) {
              throw new Error(`Failed to load GPX file: ${response.statusText}`);
            }
            gpxContent = await response.text();
          } catch (fetchError) {
            throw new Error(`Could not load GPX file from ${filePath}: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
          }
        }

        // Parse GPX content using gpx-parser-builder
        const parseMethod = gpxParser.parseGpx || gpxParser.parse || gpxParser;
        
        if (typeof parseMethod !== 'function') {
          throw new Error('GPX parser function not found');
        }
        
        const gpx = parseMethod(gpxContent);
        
        if (!isMounted) return;

        // Extract track coordinates
        const coordinates: [number, number][] = [];
        const waypoints: Array<{ lat: number; lon: number; name?: string; description?: string }> = [];

        // Process tracks
        if (gpx.trk && gpx.trk.length > 0) {
          gpx.trk.forEach((track: any) => {
            if (track.trkseg) {
              track.trkseg.forEach((segment: any) => {
                if (segment.trkpt) {
                  segment.trkpt.forEach((point: any) => {
                    const lat = point.$.lat || point.lat || point['@_lat'];
                    const lon = point.$.lon || point.lon || point['@_lon'];
                    if (lat && lon) {
                      coordinates.push([parseFloat(lat), parseFloat(lon)]);
                    }
                  });
                }
              });
            }
          });
        }

        // Try alternative structures if first attempt failed
        if (coordinates.length === 0 && gpx.gpx) {
          console.log('Trying gpx.gpx structure:', gpx.gpx);
          const gpxRoot = gpx.gpx;
          if (gpxRoot.trk) {
            gpxRoot.trk.forEach((track: any) => {
              if (track.trkseg) {
                track.trkseg.forEach((segment: any) => {
                  if (segment.trkpt) {
                    segment.trkpt.forEach((point: any) => {
                      const lat = point['@_lat'] || point.$.lat || point.lat;
                      const lon = point['@_lon'] || point.$.lon || point.lon;
                      if (lat && lon) {
                        coordinates.push([parseFloat(lat), parseFloat(lon)]);
                      }
                    });
                  }
                });
              }
            });
          }
        }

        // Process waypoints
        const waypointSources = [gpx.wpt, gpx.gpx?.wpt].filter(Boolean);
        waypointSources.forEach(wptArray => {
          if (Array.isArray(wptArray)) {
            wptArray.forEach((waypoint: any) => {
              const lat = waypoint['@_lat'] || waypoint.$.lat || waypoint.lat;
              const lon = waypoint['@_lon'] || waypoint.$.lon || waypoint.lon;
              if (lat && lon) {
                waypoints.push({
                  lat: parseFloat(lat),
                  lon: parseFloat(lon),
                  name: waypoint.name || 'Waypoint',
                  description: waypoint.desc || ''
                });
              }
            });
          }
        });


        if (!isMounted) return;

        setTrack({
          name: gpx.metadata?.name?.[0] || 'GPX Track',
          coordinates,
          waypoints
        });

      } catch (err) {
        console.error('GPX parsing error:', err);
        if (!isMounted) return;
        
        setError(err instanceof Error ? err.message : 'Failed to parse GPX data');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    parseGPX();

    return () => {
      isMounted = false;
    };
  }, [code]);

  if (isLoading) {
    return (
      <div className={`gpx-container ${className}`} style={{ 
        margin: '1rem 0',
        padding: '2rem',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: '14px'
      }}>
        Parsing GPX data...
      </div>
    );
  }

  if (error) {
    return (
      <div className={`gpx-container ${className}`} style={{ margin: '1rem 0' }}>
        <div style={{
          padding: '1rem',
          border: '1px solid var(--background-modifier-border)',
          borderRadius: '4px',
          background: 'var(--background-secondary)',
          color: 'var(--text-muted)',
          textAlign: 'center'
        }}>
          <p style={{ margin: 0, fontSize: '14px' }}>
            ⚠️ GPX parsing error: {error}
          </p>
          <details style={{ marginTop: '0.5rem' }}>
            <summary style={{ cursor: 'pointer', fontSize: '12px' }}>Show GPX source</summary>
            <pre style={{
              margin: '0.5rem 0 0 0',
              padding: '0.5rem',
              background: 'var(--background-primary)',
              borderRadius: '2px',
              fontSize: '11px',
              textAlign: 'left',
              overflowX: 'auto'
            }}>{code}</pre>
          </details>
        </div>
      </div>
    );
  }

  if (!track || track.coordinates.length === 0) {
    return (
      <div className={`gpx-container ${className}`} style={{ margin: '1rem 0' }}>
        <div style={{
          padding: '1rem',
          border: '1px solid var(--background-modifier-border)',
          borderRadius: '4px',
          background: 'var(--background-secondary)',
          color: 'var(--text-muted)',
          textAlign: 'center'
        }}>
          <p style={{ margin: 0, fontSize: '14px' }}>
            No track data found in GPX file
          </p>
        </div>
      </div>
    );
  }

  // Calculate bounds for the track
  const bounds = track.coordinates.reduce(
    (acc, [lat, lon]) => ({
      minLat: Math.min(acc.minLat, lat),
      maxLat: Math.max(acc.maxLat, lat),
      minLon: Math.min(acc.minLon, lon),
      maxLon: Math.max(acc.maxLon, lon)
    }),
    {
      minLat: track.coordinates[0][0],
      maxLat: track.coordinates[0][0],
      minLon: track.coordinates[0][1],
      maxLon: track.coordinates[0][1]
    }
  );

  const center: [number, number] = [
    (bounds.minLat + bounds.maxLat) / 2,
    (bounds.minLon + bounds.maxLon) / 2
  ];

  return (
    <div className={`gpx-container ${className}`} style={{ 
      margin: '1rem 0',
      height: '400px',
      border: '1px solid var(--background-modifier-border)',
      borderRadius: '4px',
      overflow: 'hidden'
    }}>
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        bounds={[[bounds.minLat, bounds.minLon], [bounds.maxLat, bounds.maxLon]]}
        boundsOptions={{ padding: [20, 20] }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Render track polyline */}
        <Polyline 
          positions={track.coordinates}
          color="red"
          weight={3}
          opacity={0.8}
        />

        {/* Render waypoints */}
        {track.waypoints.map((waypoint, index) => (
          <Marker key={index} position={[waypoint.lat, waypoint.lon]}>
            <Popup>
              <div>
                <strong>{waypoint.name}</strong>
                {waypoint.description && <p>{waypoint.description}</p>}
                <small>
                  {waypoint.lat.toFixed(6)}, {waypoint.lon.toFixed(6)}
                </small>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Start and end markers for track */}
        {track.coordinates.length > 1 && (
          <>
            <Marker position={track.coordinates[0]}>
              <Popup>
                <strong>Start</strong><br />
                <small>
                  {track.coordinates[0][0].toFixed(6)}, {track.coordinates[0][1].toFixed(6)}
                </small>
              </Popup>
            </Marker>
            <Marker position={track.coordinates[track.coordinates.length - 1]}>
              <Popup>
                <strong>End</strong><br />
                <small>
                  {track.coordinates[track.coordinates.length - 1][0].toFixed(6)}, {track.coordinates[track.coordinates.length - 1][1].toFixed(6)}
                </small>
              </Popup>
            </Marker>
          </>
        )}
      </MapContainer>
    </div>
  );
}