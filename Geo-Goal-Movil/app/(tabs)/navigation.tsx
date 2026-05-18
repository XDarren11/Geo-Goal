import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity, Linking } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';

export default function NavigationScreen() {
  const router = useRouter();
  const { destLat, destLng, fieldName } = useLocalSearchParams();

  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_APIKEY;
  
  const [origin, setOrigin] = useState<{ latitude: number; longitude: number } | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const destination = useMemo(() => {
    const lat = Number(destLat);
    const lng = Number(destLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { latitude: lat, longitude: lng };
  }, [destLat, destLng]);

  useEffect(() => {
    (async () => {
      // Pedimos permiso para la ubicación en tiempo real
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setPermissionDenied(true);
          return;
        }

        let location = await Location.getCurrentPositionAsync({});
        setOrigin({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      } catch (error) {
        console.log('❌ ERROR OBTENIENDO UBICACIÓN:', error);
        setLocationError('No se pudo obtener tu ubicación actual.');
      }
    })();
  }, []);

  if (!destination) {
    return (
      <View className="flex-1 bg-gray-900 items-center justify-center px-6">
        <Text className="text-red-400 font-semibold text-center mb-4">No se encontró la ubicación del partido.</Text>
        <TouchableOpacity onPress={() => router.back()} className="bg-geo-green px-4 py-2 rounded-full">
          <Text className="text-geo-black font-bold">Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (permissionDenied) {
    return (
      <View className="flex-1 bg-gray-900 items-center justify-center px-6">
        <Text className="text-yellow-300 font-semibold text-center mb-4">Debes permitir el acceso a ubicación para ver la ruta.</Text>
        <TouchableOpacity onPress={() => router.back()} className="bg-geo-green px-4 py-2 rounded-full">
          <Text className="text-geo-black font-bold">Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (locationError) {
    return (
      <View className="flex-1 bg-gray-900 items-center justify-center px-6">
        <Text className="text-red-400 font-semibold text-center mb-4">{locationError}</Text>
        <TouchableOpacity onPress={() => router.back()} className="bg-geo-green px-4 py-2 rounded-full">
          <Text className="text-geo-black font-bold">Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!origin) return <ActivityIndicator size="large" className="flex-1 bg-gray-900" />;

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          ...origin,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation={true} // Muestra el punto azul del usuario
        followsUserLocation={true}
      >
        <Marker coordinate={destination} title={fieldName as string} />

        {apiKey ? (
          <MapViewDirections
            origin={origin}
            destination={destination}
            apikey={apiKey as string}
            strokeWidth={4}
            strokeColor="#00FF00" // El verde de Geo-Goal
            onReady={(result) => {
              console.log(`Distancia: ${result.distance} km`);
              console.log(`Tiempo estimado: ${result.duration} min`);
            }}
            onError={(errorMessage) => {
              console.log('❌ ERROR DE GOOGLE DIRECTIONS:', errorMessage);
              console.log('📍 Origen:', origin);
              console.log('🏁 Destino:', destination);
            }}
          />
        ) : null}
      </MapView>

      {!apiKey ? (
        <View className="absolute bottom-6 left-5 right-5 bg-gray-900/80 border border-geo-green/30 rounded-2xl p-3">
          <Text className="text-yellow-300 text-xs mb-2 text-center">No hay API Key de Google Maps configurada. Abriendo Google Maps externo.</Text>
          <TouchableOpacity
            onPress={async () => {
              const url = `https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}`;
              await Linking.openURL(url);
            }}
            className="bg-geo-green px-3 py-2 rounded-full items-center"
          >
            <Text className="text-geo-black font-bold">Abrir Google Maps</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <TouchableOpacity 
        onPress={() => router.back()}
        className="absolute top-12 left-5 bg-gray-900/80 p-3 rounded-full"
      >
        <Text className="text-white">⬅ Volver</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: '100%', height: '100%' },
});