import React, { useEffect, useState } from 'react';
import { useValue } from '../../context/ContextProvider';
import { getRooms } from '../../actions/room';
import ReactMapGL, { Marker, Popup } from 'react-map-gl';
import Supercluster from 'supercluster';
import './cluster.css';
import { Tooltip } from '@mui/material';
import GeocoderInput from '../sidebar/GeocoderInput';
import PopupRoom from './PopupRoom';
import {
  CerealIcon,
  FruitsIcon,
  LegumesIcon,
  NutsIcon,
  VegetablesIcon,
} from '../categoryIcons';

// Define icon mappings for different categories
const iconMapping = {
  Cereals: CerealIcon,
  Fruits: FruitsIcon,
  Legumes: LegumesIcon,
  Nuts: NutsIcon,
  Vegetables: VegetablesIcon,
};

const ClusterMap = () => {
  // Accessing state and dispatch function from context
  const { state: { filteredRooms }, dispatch, mapRef } = useValue();
  
  // State variables for clustering and map interaction
  const [points, setPoints] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [bounds, setBounds] = useState([-180, -85, 180, 85]);
  const [zoom, setZoom] = useState(0);
  const [popupInfo, setPopupInfo] = useState(null);

  useEffect(() => {
    // Fetch rooms when component mounts
    getRooms(dispatch);
  }, [dispatch]);

  useEffect(() => {
    // Convert filtered rooms to points for clustering
    const points = filteredRooms.map((room) => ({
      type: 'Feature',
      properties: {
        cluster: false,
        roomId: room._id,
        price: room.price,
        title: room.title,
        description: room.description,
        lng: room.lng,
        lat: room.lat,
        images: room.images,
        uPhoto: room.uPhoto,
        uName: room.uName,
        mainCategory: room.category ? room.category.mainCategory : 'Unknown',
      },
      geometry: {
        type: 'Point',
        coordinates: [parseFloat(room.lng), parseFloat(room.lat)],
      },
    }));
    setPoints(points);
  }, [filteredRooms]);

  useEffect(() => {
    // Load clusters based on points, bounds, and zoom level
    const superclusterInstance = new Supercluster({
      radius: 75,
      maxZoom: 20,
    });
    superclusterInstance.load(points);
    setClusters(superclusterInstance.getClusters(bounds, zoom));
  }, [points, zoom, bounds]);

  useEffect(() => {
    // Update bounds when map reference changes
    if (mapRef.current) {
      setBounds(mapRef.current.getMap().getBounds().toArray().flat());
    }
  }, [mapRef?.current]);

  return (
    <ReactMapGL
      mapboxAccessToken={process.env.REACT_APP_MAP_TOKEN}
      mapStyle="mapbox://styles/mapbox/streets-v11"
      ref={mapRef}
      onZoomEnd={(e) => setZoom(Math.round(e.viewState.zoom))}
    >
      {/* Rendering clustered and individual markers */}
      {clusters.map((cluster) => {
        const { cluster: isCluster, point_count } = cluster.properties;
        const [longitude, latitude] = cluster.geometry.coordinates;
        const mainCategory = cluster.properties.mainCategory;
        const categoryIcon = iconMapping[mainCategory];
        if (isCluster) {
          // Render clustered markers
          return (
            <Marker
              key={`cluster-${cluster.id}`}
              longitude={longitude}
              latitude={latitude}
            >
              <div
                className="cluster-marker"
                style={{
                  width: `${10 + (point_count / points.length) * 20}px`,
                  height: `${10 + (point_count / points.length) * 20}px`,
                }}
                onClick={() => {
                  const zoom = Math.min(
                    supercluster.getClusterExpansionZoom(cluster.id),
                    20
                  );
                  mapRef.current.flyTo({
                    center: [longitude, latitude],
                    zoom,
                    speed: 1,
                  });
                }}
              >
                {point_count}
              </div>
            </Marker>
          );
        } else {
          // Render individual markers
          return (
            <Marker
              key={`room-${cluster.properties.roomId}`}
              longitude={longitude}
              latitude={latitude}
            >
              <Tooltip title={cluster.properties.uName}>
                <div
                  className="custom-marker"
                  style={{
                    backgroundImage: `url(${categoryIcon || cluster.properties.uPhoto})`,
                    width: '32px',
                    height: '32px',
                    cursor: 'pointer',
                    backgroundSize: 'cover',
                    borderRadius: '50%',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                  }}
                  onClick={() => setPopupInfo(cluster.properties)}
                />
              </Tooltip>
            </Marker>
          );
        }
      })}
      {/* Rendering popup when there's information */}
      {popupInfo && (
        <Popup
          longitude={popupInfo.lng}
          latitude={popupInfo.lat}
          maxWidth="auto"
          closeOnClick={false}
          focusAfterOpen={false}
          onClose={() => setPopupInfo(null)}
        >
          <div style={{ maxWidth: '300px', width: '250px' }}>
            <PopupRoom {...{ popupInfo }} />
          </div>
        </Popup>
      )}
      {/* Rendering geocoder input for location search */}
      <GeocoderInput />
    </ReactMapGL>
  );
};

export default ClusterMap;
