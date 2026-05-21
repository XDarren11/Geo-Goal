import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity, Platform, Linking, StatusBar } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';

let MapView: any;
let Marker: any;
let PROVIDER_GOOGLE: any;
let MapViewDirections: any;

if (Platform.OS !== 'web') {
  const maps = require('react-native-maps');
  MapView = maps.default;
  Marker = maps.Marker;
  PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE;
  MapViewDirections = require('react-native-maps-directions').default;
}

export default function NavigationScreen() {
  const router = useRouter();
  const { destLat, destLng, fieldName } = useLocalSearchParams();

  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_APIKEY;

  const [origin, setOrigin] = useState<any>(null);
  const destination = useMemo(() => {
    const latitude = parseFloat(destLat as string);
    const longitude = parseFloat(destLng as string);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;
    return { latitude, longitude };
  }, [destLat, destLng]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });
      setOrigin({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    })();
  }, []);

  const openInGoogleMaps = () => {
    if (!destination) return;
    const url = Platform.select({
      android: `google.navigation:q=${destination.latitude},${destination.longitude}`,
      ios: `comgooglemaps://?daddr=${destination.latitude},${destination.longitude}&directionsmode=driving`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}`,
    });
    Linking.openURL(url as string).catch(() => {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}`);
    });
  };

  if (!destination) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>Ubicación inválida.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>La navegación no está disponible en web.</Text>
        <TouchableOpacity onPress={openInGoogleMaps} style={styles.primaryButton}>
          <Text style={styles.primaryText}>Abrir en Google Maps</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!origin) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#111827" />
        <ActivityIndicator size="large" color="#39FF14" />
        <Text style={styles.loadingText}>Obteniendo ubicación...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          ...origin,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        showsUserLocation
        followsUserLocation
        showsMyLocationButton={false}
        showsCompass
        mapPadding={Platform.OS === 'android' ? { top: 0, right: 0, bottom: 0, left: 0 } : undefined}
      >
        <Marker
          coordinate={destination}
          title={fieldName as string}
          pinColor="#39FF14"
        />

        <MapViewDirections
          origin={origin}
          destination={destination}
          apikey={apiKey as string}
          strokeWidth={5}
          strokeColor="#39FF14"
          mode="DRIVING"
          onReady={(result: any) => {
            console.log(`Distancia: ${result.distance} km`);
            console.log(`Tiempo estimado: ${result.duration} min`);
          }}
          onError={(errorMessage: string) => {
            console.log('ERROR DE GOOGLE DIRECTIONS:', errorMessage);
          }}
        />
      </MapView>

      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>Volver</Text>
        </TouchableOpacity>
        {fieldName ? (
          <View style={styles.fieldBadge}>
            <Text style={styles.fieldBadgeText}>{fieldName as string}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.bottomBar}>
        <TouchableOpacity onPress={openInGoogleMaps} style={styles.navigateButton}>
          <Text style={styles.navigateButtonText}>Abrir en Google Maps</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: '100%', height: '100%' },
  centered: {
    flex: 1,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: { color: '#9ca3af', fontSize: 14, marginTop: 12 },
  message: { color: 'white', fontSize: 16, marginBottom: 16, textAlign: 'center' },
  topBar: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 44 : 60,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    backgroundColor: 'rgba(17, 24, 39, 0.9)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(57, 255, 20, 0.3)',
  },
  backText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  fieldBadge: {
    backgroundColor: 'rgba(17, 24, 39, 0.9)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(57, 255, 20, 0.2)',
  },
  fieldBadgeText: { color: '#39FF14', fontSize: 13, fontWeight: '600' },
  bottomBar: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? 24 : 34,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  navigateButton: {
    backgroundColor: '#39FF14',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 28,
    width: '100%',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#39FF14',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  navigateButtonText: { color: '#111827', fontSize: 16, fontWeight: '700' },
  primaryButton: {
    backgroundColor: '#16a34a',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 28,
    marginBottom: 12,
  },
  primaryText: { color: 'white', fontWeight: '600' },
});
