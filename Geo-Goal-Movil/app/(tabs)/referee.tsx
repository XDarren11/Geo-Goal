import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import Loader from '@/components/Loader';
import { getRefereeTodayMatches, registerMatchEvent, registerTrackingFrame } from '@/Api/refereeAPI';
import { getApiErrorMessage } from '@/lib/getApiErrorMessage';

const EVENT_OPTIONS = [
  'goal',
  'own_goal',
  'penalty_scored',
  'penalty_missed',
  'yellow_card',
  'red_card',
  'substitution',
  'foul',
  'offside',
  'var_review',
] as const;

export default function RefereeScreen() {
  const { data: user, isLoading: userLoading } = useAuth();

  const { data: assignments = [], isLoading, refetch } = useQuery({
    queryKey: ['referee', 'today', 'mobile'],
    queryFn: getRefereeTodayMatches,
    enabled: user?.role === 'referee',
  });

  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
  const [eventType, setEventType] = useState<(typeof EVENT_OPTIONS)[number]>('goal');
  const [minute, setMinute] = useState('1');
  const [teamId, setTeamId] = useState('');
  const [playerId, setPlayerId] = useState('');

  const [timestampMs, setTimestampMs] = useState(String(Date.now()));
  const [period, setPeriod] = useState<'pre' | '1H' | 'HT' | '2H' | 'ET' | 'post'>('1H');
  const [ballX, setBallX] = useState('');
  const [ballY, setBallY] = useState('');
  const [ballZ, setBallZ] = useState('');
  const [playersJson, setPlayersJson] = useState('[]');

  const selected = useMemo(() => assignments.find((a) => a.matchId === selectedMatchId) ?? null, [assignments, selectedMatchId]);

  const eventMutation = useMutation({
    mutationFn: async () => {
      if (!selectedMatchId) throw new Error('Selecciona un partido');
      return registerMatchEvent(selectedMatchId, {
        eventType,
        minute: Number(minute),
        teamId: teamId ? Number(teamId) : null,
        playerId: playerId ? Number(playerId) : null,
        metadata: {},
      });
    },
    onSuccess: async () => {
      Alert.alert('Listo', 'Evento registrado');
      await refetch();
    },
    onError: (error: any) => {
      Alert.alert('Error', getApiErrorMessage(error, 'No se pudo registrar el evento'));
    },
  });

  const trackingMutation = useMutation({
    mutationFn: async () => {
      if (!selectedMatchId) throw new Error('Selecciona un partido');

      let players: Array<Record<string, unknown>> = [];
      try {
        const parsed = JSON.parse(playersJson || '[]');
        if (!Array.isArray(parsed)) throw new Error();
        players = parsed;
      } catch {
        throw new Error('players debe ser JSON array válido');
      }

      return registerTrackingFrame(selectedMatchId, {
        timestampMs: Number(timestampMs),
        period,
        ball: {
          x: ballX ? Number(ballX) : undefined,
          y: ballY ? Number(ballY) : undefined,
          z: ballZ ? Number(ballZ) : undefined,
        },
        players,
      });
    },
    onSuccess: () => Alert.alert('Listo', 'Tracking enviado'),
    onError: (error: any) => {
      Alert.alert('Error', getApiErrorMessage(error, 'No se pudo enviar tracking'));
    },
  });

  if (userLoading) {
    return <Loader fullScreen label="Cargando modo árbitro..." />;
  }

  if (!user || user.role !== 'referee') {
    return (
      <View className="flex-1 bg-geo-black items-center justify-center px-6">
        <Text className="text-red-400 text-center font-semibold">Este apartado es solo para usuarios con rol árbitro.</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-geo-black px-4 py-5">
      <Text className="text-gray-400 text-xs">Control</Text>
      <Text className="text-geo-green text-2xl font-extrabold">Modo Árbitro</Text>
      <Text className="text-gray-500 mt-1">Partidos del día y registro en vivo.</Text>

      <View className="mt-5 rounded-2xl border border-geo-green/20 bg-gray-900/80 p-4">
        <Text className="text-white font-bold text-lg mb-3">Partidos asignados hoy</Text>
        {isLoading ? (
          <Loader label="Cargando partidos..." />
        ) : assignments.length === 0 ? (
          <Text className="text-gray-400">No tienes partidos asignados hoy.</Text>
        ) : (
          assignments.map((a) => (
            <TouchableOpacity
              key={a.id}
              onPress={() => {
                setSelectedMatchId(a.matchId);
                setTeamId(String(a.match?.homeTeamId ?? ''));
              }}
              className={`mb-2 rounded-xl border px-4 py-3 ${selectedMatchId === a.matchId ? 'border-geo-green bg-geo-green/10' : 'border-gray-700/80 bg-gray-800/80'}`}
            >
              <Text className="text-white font-semibold">
                {a.match?.homeTeam?.name || 'Local'} vs {a.match?.awayTeam?.name || 'Visitante'}
              </Text>
              <Text className="text-gray-400 text-xs mt-1">
                {a.match?.roundName || 'Partido'} · {a.match?.date ? new Date(a.match.date).toLocaleString() : 'Sin fecha'}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      <View className="mt-5 rounded-2xl border border-geo-green/20 bg-gray-900/80 p-4">
        <Text className="text-white font-bold text-lg mb-3">Registrar evento</Text>

        <Text className="text-gray-400 mb-1 text-xs">Tipo</Text>
        <View className="flex-row flex-wrap gap-2 mb-3">
          {EVENT_OPTIONS.map((evt) => (
            <TouchableOpacity
              key={evt}
              onPress={() => setEventType(evt)}
              className={`px-3 py-2 rounded-lg border ${eventType === evt ? 'border-geo-green bg-geo-green/20' : 'border-gray-700/80 bg-gray-800/80'}`}
            >
              <Text className={`${eventType === evt ? 'text-geo-green' : 'text-gray-300'} text-xs font-semibold`}>{evt}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput value={minute} onChangeText={setMinute} placeholder="Minuto" placeholderTextColor="#777" keyboardType="numeric" className="rounded-xl border border-gray-700/80 bg-gray-800/80 px-4 py-3 text-white mb-3" />
        <TextInput value={teamId} onChangeText={setTeamId} placeholder="teamId (opcional)" placeholderTextColor="#777" keyboardType="numeric" className="rounded-xl border border-gray-700/80 bg-gray-800/80 px-4 py-3 text-white mb-3" />
        <TextInput value={playerId} onChangeText={setPlayerId} placeholder="playerId (opcional)" placeholderTextColor="#777" keyboardType="numeric" className="rounded-xl border border-gray-700/80 bg-gray-800/80 px-4 py-3 text-white mb-3" />

        <TouchableOpacity
          disabled={!selected || eventMutation.isPending}
          onPress={() => eventMutation.mutate()}
          className="rounded-xl bg-geo-green py-3 items-center"
        >
          <Text className="font-bold text-geo-black">{eventMutation.isPending ? 'Enviando...' : 'Guardar evento'}</Text>
        </TouchableOpacity>
      </View>

      <View className="mt-5 rounded-2xl border border-geo-green/20 bg-gray-900/80 p-4 mb-12">
        <Text className="text-white font-bold text-lg mb-3">Registrar tracking</Text>
        <TextInput value={timestampMs} onChangeText={setTimestampMs} placeholder="timestampMs" placeholderTextColor="#777" keyboardType="numeric" className="rounded-xl border border-gray-700/80 bg-gray-800/80 px-4 py-3 text-white mb-3" />
        <TextInput value={period} onChangeText={(v) => setPeriod((v as any) || '1H')} placeholder="period (1H, 2H...)" placeholderTextColor="#777" className="rounded-xl border border-gray-700/80 bg-gray-800/80 px-4 py-3 text-white mb-3" />

        <View className="flex-row gap-2 mb-3">
          <TextInput value={ballX} onChangeText={setBallX} placeholder="ballX" placeholderTextColor="#777" keyboardType="numeric" className="flex-1 rounded-xl border border-gray-700/80 bg-gray-800/80 px-4 py-3 text-white" />
          <TextInput value={ballY} onChangeText={setBallY} placeholder="ballY" placeholderTextColor="#777" keyboardType="numeric" className="flex-1 rounded-xl border border-gray-700/80 bg-gray-800/80 px-4 py-3 text-white" />
          <TextInput value={ballZ} onChangeText={setBallZ} placeholder="ballZ" placeholderTextColor="#777" keyboardType="numeric" className="flex-1 rounded-xl border border-gray-700/80 bg-gray-800/80 px-4 py-3 text-white" />
        </View>

        <TextInput
          value={playersJson}
          onChangeText={setPlayersJson}
          placeholder='players JSON [{"userId":1,"teamId":2,"x":10,"y":20}]'
          placeholderTextColor="#777"
          multiline
          numberOfLines={5}
          className="rounded-xl border border-gray-700/80 bg-gray-800/80 px-4 py-3 text-white mb-3"
          textAlignVertical="top"
        />

        <TouchableOpacity
          disabled={!selected || trackingMutation.isPending}
          onPress={() => trackingMutation.mutate()}
          className="rounded-xl bg-geo-green py-3 items-center"
        >
          <Text className="font-bold text-geo-black">{trackingMutation.isPending ? 'Enviando...' : 'Guardar tracking'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
