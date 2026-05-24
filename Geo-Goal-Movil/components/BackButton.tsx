import React from "react";
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  /** Ruta absoluta a la que navegar con router.replace (ej: '/(tabs)/home').
   *  Si se omite, se usa router.back(). */
  to?: string;
  /** Texto opcional al lado del ícono. Por defecto "Volver". Pasa "" para ocultar. */
  label?: string;
  /** Estilo de presentación:
   *  - 'inline': fluye con el contenido, ideal para forms y auth.
   *  - 'compact': solo el círculo con ícono, sin márgenes extra. Para headers en fila.
   *  - 'floating': posición absoluta top-left, para overlays / mapas. */
  variant?: "inline" | "compact" | "floating";
};

export default function BackButton({
  to,
  label = "Volver",
  variant = "inline",
}: Props) {
  const router = useRouter();

  const handlePress = () => {
    if (to) {
      router.replace(to as any);
    } else {
      router.back();
    }
  };

  if (variant === "floating") {
    return (
      <TouchableOpacity
        onPress={handlePress}
        style={styles.floating}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={20} color="#39FF14" />
      </TouchableOpacity>
    );
  }

  if (variant === "compact") {
    return (
      <TouchableOpacity
        onPress={handlePress}
        style={styles.compact}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={20} color="#39FF14" />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={styles.inline}
      activeOpacity={0.7}
    >
      <Ionicons name="arrow-back" size={22} color="#39FF14" />
      {label !== "" && <Text style={styles.label}>{label}</Text>}
    </TouchableOpacity>
  );
}

const compactBase: ViewStyle = {
  height: 40,
  width: 40,
  borderRadius: 20,
  backgroundColor: "rgba(31, 41, 55, 0.8)",
  alignItems: "center",
  justifyContent: "center",
};

const styles = StyleSheet.create({
  inline: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    alignSelf: "flex-start",
  },
  label: {
    color: "#39FF14",
    marginLeft: 8,
    fontWeight: "700",
    fontSize: 16,
  },
  compact: {
    ...compactBase,
    marginRight: 12,
  },
  floating: {
    position: "absolute",
    top: 48,
    left: 16,
    zIndex: 10,
    ...compactBase,
    borderWidth: 1,
    borderColor: "rgba(57, 255, 20, 0.2)",
  },
});
