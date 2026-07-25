import React, { useEffect, useRef, useState } from 'react';
import axiosClient from '../api/axiosClient';
import { Loader2, AlertCircle } from 'lucide-react';
declare const L: any;

export const HeatmapView: React.FC = () => {
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);

  const fetchHeatmap = async () => {
    try {
      setLoading(true);
      const response = await axiosClient.get('/api/grievances/heatmap');
      if (response.data.success) setHeatmapData(response.data.heatmap);
    } catch (err: any) { 
      setError('Could not connect to geo-mapping service.'); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { fetchHeatmap(); }, []);

  useEffect(() => {
    if (loading || error || !mapContainerRef.current) return;
    if (typeof L === 'undefined' || typeof L.markerClusterGroup === 'undefined') return;

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapContainerRef.current, { center: [22.535, 88.390], zoom: 12 });
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom: 20 }).addTo(mapInstanceRef.current);
      
      // Initialize the Cluster Group with Dynamic Severity Coloring
      layerGroupRef.current = L.markerClusterGroup({
        showCoverageOnHover: false,
        spiderfyOnMaxZoom: true,
        maxClusterRadius: 50,
        iconCreateFunction: (cluster: any) => {
          const children = cluster.getAllChildMarkers();
          const count = cluster.getChildCount();
          
          // Calculate dynamic size using a logarithmic scale
          // Base size 40px, growing smoothly so massive clusters don't break the UI
          const size = Math.floor(40 + (Math.log(count) * 12));
          
          // Optionally, scale the font size slightly so big numbers fit
          const fontSize = Math.min(20, Math.floor(12 + (Math.log(count) * 2)));

          // 1. Find the highest urgency score in this specific cluster
          let maxUrgency = 0;
          children.forEach((marker: any) => {
            if (marker.options.urgencyScore > maxUrgency) {
              maxUrgency = marker.options.urgencyScore;
            }
          });

          // 2. Assign colors based on the maximum urgency found
          let color = '#10B981'; // Default: Low (Emerald)
          let glow = 'rgba(16, 185, 129, 0.4)';
          
          if (maxUrgency >= 75) { 
            color = '#E76F51'; // Critical (Red)
            glow = 'rgba(231, 111, 81, 0.5)';
          } else if (maxUrgency >= 45) { 
            color = '#F59E0B'; // Medium (Amber)
            glow = 'rgba(245, 158, 11, 0.4)';
          }

          // 3. Render the Neumorphic cluster icon with dynamic sizing
          return L.divIcon({
            className: 'bg-transparent',
            html: `
              <div class="neumorphic-convex flex items-center justify-center font-black rounded-full transition-all duration-300" 
                   style="width: ${size}px; height: ${size}px; 
                          color: ${color}; 
                          border: 2px solid ${color}; 
                          background-color: ${color}15;
                          font-size: ${fontSize}px;
                          box-shadow: 4px 4px 10px rgba(0,0,0,0.15), -4px -4px 10px rgba(255,255,255,0.05), 0 0 15px ${glow};">
                ${count}
              </div>
            `,
            iconSize: L.point(size, size, true),
          });
        }
      }).addTo(mapInstanceRef.current);
    }

    if (layerGroupRef.current) layerGroupRef.current.clearLayers();

    heatmapData.forEach((item) => {
      if (!item.lat || !item.lng) return;
      
      let color = '#10B981'; 
      let urgencyText = 'Low Urgency';
      
      if (item.urgencyScore >= 75) { 
        color = '#E76F51'; urgencyText = 'Critical Urgency'; 
      } else if (item.urgencyScore >= 45) { 
        color = '#F59E0B'; urgencyText = 'High/Medium'; 
      }

      const customIcon = L.divIcon({
        className: 'bg-transparent',
        html: `
          <div class="neumorphic-concave rounded-full flex items-center justify-center" 
               style="width: 24px; height: 24px; background-color: ${color}90; border: 2px solid ${color};">
            <div style="width: 8px; height: 8px; background-color: ${color}; border-radius: 50%;"></div>
          </div>
        `,
        iconSize: L.point(24, 24, true),
      });

      // Pass the urgencyScore into the marker options so the cluster can read it!
      const marker = L.marker([item.lat, item.lng], { 
        icon: customIcon,
        urgencyScore: item.urgencyScore 
      });
      
      const popupContent = `
        <div style="font-family: 'Inter', sans-serif; padding: 4px; width: 220px; color: #111;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #ddd; padding-bottom: 6px; margin-bottom: 8px;">
            <span style="font-weight: 800; font-size: 10px; text-transform: uppercase; color: ${color};">${item.category}</span>
            <span style="background-color: ${color}15; color: ${color}; font-weight: 800; font-size: 10px; padding: 2px 8px; border-radius: 6px;">${item.urgencyScore}/100</span>
          </div>
          <p style="font-size: 12px; font-weight: 800; margin: 0 0 4px 0;">${item.address}</p>
          <div style="font-size: 10px; font-weight: 700; color: #666; text-transform: uppercase;">Status: <span style="font-weight: 900; color: #111;">${urgencyText}</span></div>
        </div>`;
      
      marker.bindPopup(popupContent); 
      layerGroupRef.current.addLayer(marker);
    });

    const resizeObserver = new ResizeObserver(() => { if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize(); });
    resizeObserver.observe(mapContainerRef.current);
    return () => resizeObserver.disconnect();
  }, [loading, error, heatmapData]);

  useEffect(() => { 
    return () => { 
      if (mapInstanceRef.current) { 
        mapInstanceRef.current.remove(); 
        mapInstanceRef.current = null; 
      } 
    }; 
  }, []);

  if (loading) return (<div className="flex flex-col items-center justify-center h-125 neumorphic-concave rounded-4xl"><Loader2 className="w-8 h-8 theme-accent animate-spin" /><span className="theme-text-muted font-black text-xs mt-3 uppercase tracking-wider">Compiling GIS Layers...</span></div>);
  if (error) return (<div className="flex flex-col items-center justify-center h-125 neumorphic-concave rounded-4xl p-6"><AlertCircle className="w-10 h-10 text-red-500 mb-2" /><span className="theme-text-main font-black text-sm">Mapping Ingress Failure</span><p className="theme-text-muted text-xs text-center mt-1">{error}</p></div>);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <div>
          <h3 className="text-xl font-black theme-text-main tracking-tight">Constituency Distress Heatmap</h3>
          <p className="text-xs theme-text-muted font-bold mt-1">Real-time localized clusters scaled by AI urgency</p>
        </div>
        <div className="flex items-center space-x-4 text-[10px] font-black uppercase tracking-wider neumorphic-concave px-4 py-2 rounded-xl">
          <div className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 bg-red-500 rounded-full"></span><span className="theme-text-muted">Critical</span></div>
          <div className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 bg-amber-500 rounded-full"></span><span className="theme-text-muted">Medium</span></div>
          <div className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span><span className="theme-text-muted">Low</span></div>
        </div>
      </div>
      <div ref={mapContainerRef} className="w-full h-130 rounded-4xl overflow-hidden z-10" id="map-canvas" />
    </div>
  );
};