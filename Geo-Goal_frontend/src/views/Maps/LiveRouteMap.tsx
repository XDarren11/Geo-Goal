import { useState, useEffect } from "react";
import { GoogleMap, useJsApiLoader, DirectionsRenderer, Marker } from "@react-google-maps/api";

interface LiveRouteMapProps {
  destinationLat: number;
  destinationLng: number;
}

const containerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '1rem'
};

export const LiveRouteMap = ({ destinationLat, destinationLng }: LiveRouteMapProps) => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
  });

  const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [directionsResponse, setDirectionsResponse] = useState<google.maps.DirectionsResult | null>(null);
  const [distance, setDistance] = useState<string>("");
  const [duration, setDuration] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          setErrorMsg("Debes permitir el acceso a tu ubicación para ver la ruta.");
        }
      );
    } else {
      setErrorMsg("Tu navegador no soporta geolocalización.");
    }
  }, []);

  // 3. Calcular la ruta una vez que tenemos la ubicación del jugador y el mapa cargó
  useEffect(() => {
    if (isLoaded && userLocation) {
      const directionsService = new window.google.maps.DirectionsService();
      
      directionsService.route(
        {
          origin: userLocation,
          destination: { lat: destinationLat, lng: destinationLng },
          // Puedes cambiar a WALKING, BICYCLING o TRANSIT
          travelMode: window.google.maps.TravelMode.DRIVING, 
        },
        (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK && result) {
            setDirectionsResponse(result);
            setDistance(result.routes[0].legs[0].distance?.text || "");
            setDuration(result.routes[0].legs[0].duration?.text || "");
          } else {
            setErrorMsg("No se pudo calcular una ruta a este destino.");
          }
        }
      );
    }
  }, [isLoaded, userLocation, destinationLat, destinationLng]);

  if (errorMsg) {
    return <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-200">{errorMsg}</div>;
  }

  if (!isLoaded || !userLocation) {
    return (
      <div className="h-[400px] w-full bg-slate-100 animate-pulse rounded-xl flex items-center justify-center">
        <p className="text-slate-500 font-semibold">Buscando tu ubicación...</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Tarjeta de información de la ruta */}
      {distance && duration && (
        <div className="absolute top-4 left-4 z-10 bg-white p-3 rounded-lg shadow-lg border border-slate-200">
          <p className="font-bold text-slate-800 text-sm">Distancia: <span className="text-blue-600">{distance}</span></p>
          <p className="font-bold text-slate-800 text-sm">Tiempo aprox: <span className="text-green-600">{duration}</span></p>
        </div>
      )}

      {/* El Mapa de Google */}
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={userLocation}
        zoom={14}
        options={{
          disableDefaultUI: true, // Oculta los botones molestos por defecto
          zoomControl: true,
        }}
      >

        {directionsResponse && (
          <DirectionsRenderer 
            directions={directionsResponse} 
            options={{
              polylineOptions: {
                strokeColor: "#3b82f6", // Línea azul bonita
                strokeWeight: 5,
              }
            }}
          />
        )}

        {/* Marcador de respaldo por si la ruta tarda en cargar */}
        {!directionsResponse && <Marker position={{ lat: destinationLat, lng: destinationLng }} />}
      </GoogleMap>
    </div>
  );
};