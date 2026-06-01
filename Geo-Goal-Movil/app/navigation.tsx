import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity, Linking } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import BackButton from '@/components/BackButton';

export default function NavigationScreen() {
  const router = useRouter();
  const { destLat, destLng, fieldName } = useLocalSearchParams();

  const apiKey = "AIzaSyBR1HNrmLDsckW2YKQCHYjfJP5VNXctpmc";

  const [origin, setOrigin] = useState<{ latitude: number; longitude: number } | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [servicesDisabled, setServicesDisabled] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [directionsError, setDirectionsError] = useState(false);
  const locationWatchRef = useRef<Location.LocationSubscription | null>(null);

  const destination = useMemo(() => {
    const lat = Number(destLat);
    const lng = Number(destLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { latitude: lat, longitude: lng };
  }, [destLat, destLng]);

  // Cleanup location watch on unmount
  useEffect(() => {
    return () => {
      if (locationWatchRef.current) {
        locationWatchRef.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // Paso 1: Verificar que los servicios de ubicación estén prendidos
        const enabled = await Location.hasServicesEnabledAsync();
        if (!enabled) {
          if (!cancelled) {
            setServicesDisabled(true);
            setIsLoadingLocation(false);
          }
          return;
        }

        // Paso 2: Pedir permiso de ubicación en primer plano
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (!cancelled) {
            setPermissionDenied(true);
            setIsLoadingLocation(false);
          }
          return;
        }

        // Paso 3: Intentar obtener la última ubicación conocida (rápido)
        let coords: { latitude: number; longitude: number } | null = null;

        try {
          const lastKnown = await Location.getLastKnownPositionAsync({
            maxAge: 300000, // hasta 5 minutos de antigüedad
          });
          if (lastKnown && !cancelled) {
            coords = {
              latitude: lastKnown.coords.latitude,
              longitude: lastKnown.coords.longitude,
            };
            console.log('✅ Usando última ubicación conocida');
          }
        } catch {
          console.log('⚠️ Falló getLastKnownPositionAsync');
        }

        // Paso 4: getCurrentPositionAsync (GPS en tiempo real)
        if (!coords) {
          try {
            const current = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            if (!cancelled) {
              coords = {
                latitude: current.coords.latitude,
                longitude: current.coords.longitude,
              };
              console.log('✅ Ubicación GPS obtenida');
            }
          } catch (gpsError) {
            console.log('❌ getCurrentPositionAsync falló:', (gpsError as any)?.message);
          }
        }

        // Paso 5: watchPositionAsync con timeout (más confiable en emuladores Android)
        if (!coords) {
          try {
            const watched = await new Promise<Location.LocationObject>((resolve, reject) => {
              let settled = false;
              let sub: Location.LocationSubscription | null = null;

              const timeout = setTimeout(() => {
                if (settled) return;
                settled = true;
                sub?.remove();
                reject(new Error('watchPositionAsync timeout (8s)'));
              }, 8000);

              Location.watchPositionAsync(
                {
                  accuracy: Location.Accuracy.Balanced,
                  timeInterval: 1000,
                  distanceInterval: 0,
                },
                (loc) => {
                  if (settled) return;
                  settled = true;
                  clearTimeout(timeout);
                  sub?.remove();
                  resolve(loc);
                }
              ).then((subscription) => {
                sub = subscription;
              });
            });

            if (!cancelled) {
              coords = {
                latitude: watched.coords.latitude,
                longitude: watched.coords.longitude,
              };
              console.log('✅ Ubicación vía watchPositionAsync');
            }
          } catch (watchError) {
            console.log('❌ watchPositionAsync falló:', (watchError as any)?.message);
          }
        }

        if (coords && !cancelled) {
          setOrigin(coords);
          setIsLoadingLocation(false);
        } else {
          // Sin ubicación: mostramos el mapa centrado en la cancha + botón Google Maps
          if (!cancelled) {
            console.log('ℹ️ Sin ubicación — mostrando mapa centrado en destino');
            setIsLoadingLocation(false);
            // origin se queda null → la UI muestra mapa sin ruta
          }
        }
      } catch (error) {
        console.log('❌ ERROR GENERAL DE UBICACIÓN:', error);
        if (!cancelled) {
          setLocationError('Error inesperado al obtener tu ubicación.');
          setIsLoadingLocation(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const openExternalMaps = useCallback(async () => {
    if (!destination) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}`;
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    }
  }, [destination]);

  if (!destination) {
    return (
      <View className="flex-1 bg-gray-900 items-center justify-center px-6">
        <Text className="text-red-400 font-semibold text-center mb-4">No se encontró la ubicación del partido.</Text>
        <BackButton />
      </View>
    );
  }

  if (servicesDisabled) {
    return (
      <View className="flex-1 bg-gray-900 items-center justify-center px-6">
        <Text className="text-yellow-300 font-semibold text-center mb-2">Ubicación desactivada</Text>
        <Text className="text-gray-400 text-center mb-4">
          Activa la ubicación (GPS) en los ajustes de tu dispositivo para ver la ruta.
        </Text>
        <TouchableOpacity
          onPress={openExternalMaps}
          className="bg-geo-green px-4 py-2 rounded-full mb-4"
        >
          <Text className="text-geo-black font-bold">Abrir Google Maps</Text>
        </TouchableOpacity>
        <BackButton />
      </View>
    );
  }

  if (permissionDenied) {
    return (
      <View className="flex-1 bg-gray-900 items-center justify-center px-6">
        <Text className="text-yellow-300 font-semibold text-center mb-2">Permiso de ubicación denegado</Text>
        <Text className="text-gray-400 text-center mb-4">
          Ve a Ajustes &gt; Apps &gt; Geo-Goal &gt; Permisos y activa "Ubicación".
        </Text>
        <TouchableOpacity
          onPress={openExternalMaps}
          className="bg-geo-green px-4 py-2 rounded-full mb-4"
        >
          <Text className="text-geo-black font-bold">Abrir Google Maps</Text>
        </TouchableOpacity>
        <BackButton />
      </View>
    );
  }

  if (locationError) {
    return (
      <View className="flex-1 bg-gray-900 items-center justify-center px-6">
        <Text className="text-red-400 font-semibold text-center mb-4">{locationError}</Text>
        <TouchableOpacity
          onPress={openExternalMaps}
          className="bg-geo-green px-4 py-2 rounded-full mb-4"
        >
          <Text className="text-geo-black font-bold">Abrir Google Maps</Text>
        </TouchableOpacity>
        <BackButton />
      </View>
    );
  }

  if (isLoadingLocation) {
    return (
      <View className="flex-1 bg-gray-900 items-center justify-center">
        <ActivityIndicator size="large" color="#00FF00" />
        <Text className="text-gray-400 mt-4">Obteniendo tu ubicación...</Text>
      </View>
    );
  }

  // Si no tenemos origen, mostramos el mapa centrado en la cancha sin ruta
  const hasOrigin = origin != null;

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: hasOrigin ? origin.latitude : destination.latitude,
          longitude: hasOrigin ? origin.longitude : destination.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation={hasOrigin}
        followsUserLocation={hasOrigin}
        onMapReady={() => console.log('✅ Mapa listo')}
      >
        <Marker coordinate={destination} title={fieldName as string} />

        {apiKey && hasOrigin && !directionsError ? (
          <MapViewDirections
            origin={origin}
            destination={destination}
            apikey={apiKey as string}
            strokeWidth={4}
            strokeColor="#00FF00"
            onReady={(result) => {
              console.log(`✅ Ruta lista — Distancia: ${result.distance} km, Tiempo: ${result.duration} min`);
            }}
            onError={(errorMessage) => {
              console.log('❌ ERROR DE GOOGLE DIRECTIONS:', errorMessage);
              console.log('📍 Origen:', origin);
              console.log('🏁 Destino:', destination);
              setDirectionsError(true);
            }}
          />
        ) : null}
      </MapView>

      {/* Botón flotante de respaldo para abrir Google Maps externo */}
      <View className="absolute bottom-6 left-5 right-5 bg-gray-900/90 border border-geo-green/40 rounded-2xl p-3">
        {!hasOrigin && (
          <Text className="text-yellow-300 text-xs mb-2 text-center">
            No se pudo obtener tu ubicación. Abre Google Maps para ver la ruta.
          </Text>
        )}
        {directionsError && (
          <Text className="text-yellow-300 text-xs mb-2 text-center">
            No se pudo trazar la ruta en el mapa. Usa el botón para abrir Google Maps.
          </Text>
        )}
        <TouchableOpacity
          onPress={openExternalMaps}
          className="bg-geo-green px-3 py-2 rounded-full items-center"
        >
          <Text className="text-geo-black font-bold">
            {(directionsError || !hasOrigin) ? 'Abrir en Google Maps' : 'Cómo llegar'}
          </Text>
        </TouchableOpacity>
      </View>

      <BackButton variant="floating" label="" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: '100%', height: '100%' },
});