import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';

export default function NavigationScreen() {
  const router = useRouter();
  const { destLat, destLng, fieldName } = useLocalSearchParams();

  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_APIKEY;
  console.log("MI LLAVE DESDE EL ENV ES:", apiKey);
  
  const [origin, setOrigin] = useState<any>(null);
  const destination = {
    latitude: parseFloat(destLat as string),
    longitude: parseFloat(destLng as string),
  };

  useEffect(() => {
    (async () => {
      // Pedimos permiso para la ubicación en tiempo real
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      let location = await Location.getCurrentPositionAsync({});
      setOrigin({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    })();
  }, []);

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
      </MapView>

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