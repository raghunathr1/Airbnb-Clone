import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { FiMapPin, FiArrowRight } from "react-icons/fi";

import "leaflet/dist/leaflet.css";
import "./PropertyMap.css";

// Custom property marker.
const propertyIcon = L.divIcon({
  className: "property-map-marker-wrapper",
  html: '<div class="property-map-marker">₹</div>',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -35],
});

// Make sure coordinates are valid.
const getCoordinates = (property) => {
  const latitude = Number(property.latitude);
  const longitude = Number(property.longitude);

  if (
    property.latitude === undefined ||
    property.latitude === null ||
    property.latitude === "" ||
    property.longitude === undefined ||
    property.longitude === null ||
    property.longitude === ""
  ) {
    return null;
  }

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return [latitude, longitude];
};

// Automatically position the map around visible properties.
function MapAutoFit({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) return;

    if (points.length === 1) {
      map.setView(points[0], 13);
      return;
    }

    const bounds = L.latLngBounds(points);

    map.fitBounds(bounds, {
      padding: [35, 35],
      maxZoom: 14,
    });
  }, [map, points]);

  return null;
}

function PropertyMap({ properties = [], onPropertyClick }) {
  const mappedProperties = useMemo(() => {
    return properties
      .map((property) => ({
        property,
        coordinates: getCoordinates(property),
      }))
      .filter((item) => item.coordinates !== null);
  }, [properties]);

  const points = useMemo(
    () => mappedProperties.map((item) => item.coordinates),
    [mappedProperties],
  );

  // Do not display a fake location for properties
  // whose latitude and longitude have not been added.
  if (mappedProperties.length === 0) {
    return (
      <div className="property-map-empty">
        <FiMapPin />

        <h3>Location not available on map</h3>

        <p>
          No matching properties have valid latitude and longitude coordinates
          yet. Add coordinates from the Host Dashboard to display their map
          markers.
        </p>
      </div>
    );
  }

  return (
    <div className="property-map-container">
      <div className="property-map-heading">
        <div>
          <h2>Explore on the map</h2>

          <p>
            {mappedProperties.length}{" "}
            {mappedProperties.length === 1 ? "property has" : "properties have"}{" "}
            map coordinates.
          </p>
        </div>
      </div>

      <MapContainer
        className="property-map"
        center={points[0]}
        zoom={12}
        scrollWheelZoom
        key={mappedProperties.map(({ property }) => property._id).join("-")}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapAutoFit points={points} />

        {mappedProperties.map(({ property, coordinates }) => (
          <Marker key={property._id} position={coordinates} icon={propertyIcon}>
            <Popup>
              <div className="property-map-popup">
                <strong>{property.title}</strong>

                <p className="property-map-popup-location">
                  <FiMapPin />
                  {property.location}
                </p>

                <p className="property-map-popup-price">
                  ₹{Number(property.price).toLocaleString("en-IN")}
                  <span> / night</span>
                </p>

                <button
                  type="button"
                  className="property-map-popup-button"
                  onClick={() => onPropertyClick?.(property._id)}
                >
                  View property <FiArrowRight />
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

export default PropertyMap;
