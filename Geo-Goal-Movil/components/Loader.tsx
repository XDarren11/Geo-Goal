import { Text, View } from 'react-native';

type LoaderProps = {
  label?: string;
  fullScreen?: boolean;
};

export default function Loader({ label = 'Cargando...', fullScreen = false }: LoaderProps) {
  return (
    <View
      className={fullScreen ? 'flex-1 items-center justify-center bg-geo-black' : 'items-center justify-center py-10'}
      accessibilityRole="progressbar"
      accessible
    >
      <View className="items-center gap-3">
        <View className="flex-row items-center gap-2">
          <Text className="text-3xl">⚽</Text>
          <View className="h-2 w-2 rounded-full bg-geo-green" />
        </View>
        <Text className="text-sm text-gray-400">{label}</Text>
      </View>
    </View>
  );
}
