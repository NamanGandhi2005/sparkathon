// frontend/src/components/specific/StoresMapLeaflet.tsx
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L, { LatLngExpression } from 'leaflet';
import { SurplusCrate } from '../../types/data'; // Removed LocalBusiness import

// --- Mock Store Locations ---
interface StoreLocation {
    storeId: string;
    name: string;
    lat: number;
    lng: number;
}
const MOCK_STORE_LOCATIONS: StoreLocation[] = [
    { storeId: "walmart_001", name: "Walmart Central Pickup (Main St)", lat: 34.0522, lng: -118.2437 },
    { storeId: "walmart_002", name: "Walmart Northside Hub (Oak Ave)", lat: 34.0788, lng: -118.2599 },
];

// Default Leaflet Icon Setup
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const defaultCenter: LatLngExpression = [34.0522, -118.2437];
const defaultZoom = 12;

interface MapMarkerData {
  id: string;
  name: string;
  position: LatLngExpression;
  popupContent?: React.ReactNode;
}

const ChangeView: React.FC<{ center: LatLngExpression; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    const currentMapCenter = map.getCenter();
    const targetLatLng = L.latLng(center); // Normalize center

    if (
      Math.abs(currentMapCenter.lat - targetLatLng.lat) > 0.0001 || // Use .lat
      Math.abs(currentMapCenter.lng - targetLatLng.lng) > 0.0001    // Use .lng
    ) {
      map.flyTo(targetLatLng, zoom);
    } else if (map.getZoom() !== zoom) {
      map.setZoom(zoom);
    }
  }, [center, zoom, map]);
  return null;
};

interface StoresMapLeafletProps {
    // businesses?: LocalBusiness[]; // Removed businesses prop
    crates?: SurplusCrate[];
    mapCenter?: LatLngExpression;
    onCrateClick?: (crateId: string) => void;
}

const StoresMapLeaflet: React.FC<StoresMapLeafletProps> = ({
    // businesses = [], // Removed businesses prop
    crates = [],
    mapCenter: externalMapCenter,
    onCrateClick
}) => {
    const [markers, setMarkers] = useState<MapMarkerData[]>([]);
    const [currentMapCenter, setCurrentMapCenter] = useState<LatLngExpression>(externalMapCenter || defaultCenter);

    useEffect(() => {
        const generatedMarkers: MapMarkerData[] = [];

        crates.forEach(crate => {
            const storeLocation = MOCK_STORE_LOCATIONS.find(loc => loc.storeId === crate.storeId);
            if (storeLocation) {
                generatedMarkers.push({
                    id: crate.crateId,
                    name: `Surplus Crate Pickup: ${storeLocation.name}`,
                    position: [storeLocation.lat, storeLocation.lng],
                    popupContent: ( /* ... your popup content for crates ... */
                        <div className="text-xs p-1">
                            <strong className="block text-sm mb-1">Crate @ {storeLocation.name}</strong>
                            <p className="mb-0.5">Price: ${crate.listingPrice.toFixed(2)}</p>
                            <p className="mb-0.5">Pickup: {crate.pickupWindow}</p>
                            <p className="mb-1"><span className="font-semibold">Items:</span> {crate.items.map(i => i.name).join(', ').substring(0, 50)}...</p>
                            {onCrateClick && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onCrateClick(crate.crateId); }}
                                    className="block w-full text-center bg-green-500 text-white hover:bg-green-600 text-xs mt-1 py-1 px-2 rounded font-medium"
                                >
                                    View Details / Offer
                                </button>
                            )}
                        </div>
                    )
                });
            }
        });

        setMarkers(generatedMarkers);

        if (externalMapCenter) {
            setCurrentMapCenter(externalMapCenter);
        } else if (generatedMarkers.length > 0) {
            setCurrentMapCenter(generatedMarkers[0].position);
        } else {
            setCurrentMapCenter(defaultCenter);
        }

    }, [crates, externalMapCenter, onCrateClick]); // Removed 'businesses' from dependencies

    return (
        <MapContainer
            key={JSON.stringify(currentMapCenter) + markers.length}
            center={currentMapCenter}
            zoom={defaultZoom}
            style={{ height: '100%', width: '100%', minHeight: 'inherit' }}
            className="rounded-md"
        >
            <ChangeView center={currentMapCenter} zoom={defaultZoom} />
            <TileLayer
                attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {markers.map((marker: MapMarkerData) => ( // Explicitly typed marker
                <Marker
                    key={marker.id}
                    position={marker.position}
                    // No icon prop for default icons
                >
                    <Popup minWidth={180}>
                        {marker.popupContent || marker.name}
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
};

export default StoresMapLeaflet;