import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, ScrollView } from 'react-native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { getLeagues } from '@/Api/leagueAPI';
import { getMyTeams } from '@/Api/teamAPI';
import { generateLeagueInvitation, generateTeamInvitation, joinLeagueByCode, joinTeamByCode } from '@/Api/invitationAPI';
import Loader from '@/components/Loader';
import type { League, Team, Role } from '@/types';
import { getApiErrorMessage } from '@/lib/getApiErrorMessage';

export default function CodesScreen() {
  const { data: user } = useAuth();
  const role = (user?.role as Role) || '';
  const [selectedLeagueId, setSelectedLeagueId] = useState<number | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [leagueCode, setLeagueCode] = useState('');
  const [teamCode, setTeamCode] = useState('');
  const [expiresIn, setExpiresIn] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');

  const { data: leagues = [], isLoading: leaguesLoading } = useQuery({
    queryKey: ['codes-leagues'],
    queryFn: getLeagues,
    enabled: role === 'admin',
  });

  const { data: teams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ['codes-teams'],
    queryFn: getMyTeams,
    enabled: role === 'coach',
  });

  const selectedLeague = useMemo(
    () => leagues.find((league) => league.id === selectedLeagueId) ?? null,
    [leagues, selectedLeagueId]
  );

  const selectedTeam = useMemo(
    () => teams.find((team) => team.id === selectedTeamId) ?? null,
    [teams, selectedTeamId]
  );

  const generateLeagueMutation = useMutation({
    mutationFn: () => generateLeagueInvitation(selectedLeagueId as number, expiresIn ? Number(expiresIn) : undefined),
    onSuccess: (data) => {
      setGeneratedCode(data.code);
      Alert.alert('Código generado', `Código: ${data.code}`);
    },
    onError: (error: any) => Alert.alert('Error', getApiErrorMessage(error, 'No se pudo generar el código')),
  });

  const generateTeamMutation = useMutation({
    mutationFn: () => generateTeamInvitation(selectedTeamId as number, expiresIn ? Number(expiresIn) : undefined),
    onSuccess: (data) => {
      setGeneratedCode(data.code);
      Alert.alert('Código generado', `Código: ${data.code}`);
    },
    onError: (error: any) => Alert.alert('Error', getApiErrorMessage(error, 'No se pudo generar el código')),
  });

  const joinLeagueMutation = useMutation({
    mutationFn: () =>
      joinLeagueByCode(
        leagueCode.trim().toUpperCase(),
        role === 'referee' ? undefined : (selectedTeamId as number)
      ),
    onSuccess: (message) => Alert.alert('Listo', message),
    onError: (error: any) => Alert.alert('Error', getApiErrorMessage(error, 'No se pudo unir a la liga')),
  });

  const joinTeamMutation = useMutation({
    mutationFn: () => joinTeamByCode(teamCode.trim().toUpperCase()),
    onSuccess: (message) => Alert.alert('Listo', message),
    onError: (error: any) => Alert.alert('Error', getApiErrorMessage(error, 'No se pudo unir al equipo')),
  });

  if (!user) {
    return <Loader fullScreen label="Cargando acceso..." />;
  }

  return (
    <ScrollView className="flex-1 bg-geo-black px-4 py-4">
      <Text className="text-geo-green text-2xl font-bold">Códigos</Text>
      <Text className="text-gray-400 mt-1">Genera o usa códigos de invitación según tu rol.</Text>

      {role === 'admin' && (
        <View className="mt-5 rounded-2xl border border-geo-green/30 bg-gray-900 p-4">
          <Text className="text-white text-lg font-bold mb-3">Generar código de liga</Text>
          {leaguesLoading ? (
            <Loader label="Cargando ligas..." />
          ) : (
            <FlatList
              scrollEnabled={false}
              data={leagues}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }: { item: League }) => (
                <TouchableOpacity
                  onPress={() => setSelectedLeagueId(item.id)}
                  className={`mb-2 rounded-xl border px-4 py-3 ${selectedLeagueId === item.id ? 'border-geo-green bg-geo-green/10' : 'border-gray-700 bg-gray-800'}`}
                >
                  <Text className="text-white font-semibold">{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          )}

          <TextInput
            value={expiresIn}
            onChangeText={setExpiresIn}
            placeholder="Expira en minutos (opcional)"
            placeholderTextColor="#777"
            keyboardType="numeric"
            className="mt-3 rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-white"
          />

          <TouchableOpacity
            disabled={!selectedLeagueId || generateLeagueMutation.isPending}
            onPress={() => generateLeagueMutation.mutate()}
            className="mt-3 rounded-xl bg-geo-green py-3 items-center"
          >
            <Text className="font-bold text-geo-black">Generar código</Text>
          </TouchableOpacity>

          {generatedCode ? <Text className="mt-3 text-center text-geo-green font-bold tracking-[4px]">{generatedCode}</Text> : null}
        </View>
      )}

      {role === 'coach' && (
        <View className="mt-5 rounded-2xl border border-geo-green/30 bg-gray-900 p-4">
          <Text className="text-white text-lg font-bold mb-3">Código para tu equipo</Text>
          {teamsLoading ? (
            <Loader label="Cargando equipos..." />
          ) : (
            <FlatList
              scrollEnabled={false}
              data={teams}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }: { item: Team }) => (
                <TouchableOpacity
                  onPress={() => setSelectedTeamId(item.id)}
                  className={`mb-2 rounded-xl border px-4 py-3 ${selectedTeamId === item.id ? 'border-geo-green bg-geo-green/10' : 'border-gray-700 bg-gray-800'}`}
                >
                  <Text className="text-white font-semibold">{item.name}</Text>
                  <Text className="text-gray-400 text-xs mt-1">{item.league?.name || 'Sin liga'}</Text>
                </TouchableOpacity>
              )}
            />
          )}

          <TextInput
            value={expiresIn}
            onChangeText={setExpiresIn}
            placeholder="Expira en minutos (opcional)"
            placeholderTextColor="#777"
            keyboardType="numeric"
            className="mt-3 rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-white"
          />

          <TouchableOpacity
            disabled={!selectedTeamId || generateTeamMutation.isPending}
            onPress={() => generateTeamMutation.mutate()}
            className="mt-3 rounded-xl bg-geo-green py-3 items-center"
          >
            <Text className="font-bold text-geo-black">Generar código</Text>
          </TouchableOpacity>

          {generatedCode ? <Text className="mt-3 text-center text-geo-green font-bold tracking-[4px]">{generatedCode}</Text> : null}
        </View>
      )}

      {(role === 'coach' || role === 'referee') && (
        <View className="mt-5 rounded-2xl border border-geo-green/30 bg-gray-900 p-4">
          <Text className="text-white text-lg font-bold mb-3">
            {role === 'referee' ? 'Unirme a una liga como árbitro' : 'Unir tu equipo a una liga'}
          </Text>
          <TextInput
            value={leagueCode}
            onChangeText={(text) => setLeagueCode(text.toUpperCase())}
            placeholder="Código de liga"
            placeholderTextColor="#777"
            autoCapitalize="characters"
            className="rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-white tracking-[6px]"
          />
          <TouchableOpacity
            disabled={(role !== 'referee' && !selectedTeamId) || !leagueCode.trim() || joinLeagueMutation.isPending}
            onPress={() => joinLeagueMutation.mutate()}
            className="mt-3 rounded-xl bg-geo-green py-3 items-center"
          >
            <Text className="font-bold text-geo-black">Unir a liga</Text>
          </TouchableOpacity>
        </View>
      )}

      {role === 'player' && (
        <View className="mt-5 rounded-2xl border border-geo-green/30 bg-gray-900 p-4">
          <Text className="text-white text-lg font-bold mb-3">Unirse a un equipo</Text>
          <TextInput
            value={teamCode}
            onChangeText={(text) => setTeamCode(text.toUpperCase())}
            placeholder="Código del equipo"
            placeholderTextColor="#777"
            autoCapitalize="characters"
            className="rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-white tracking-[6px]"
          />
          <TouchableOpacity
            disabled={!teamCode.trim() || joinTeamMutation.isPending}
            onPress={() => joinTeamMutation.mutate()}
            className="mt-3 rounded-xl bg-geo-green py-3 items-center"
          >
            <Text className="font-bold text-geo-black">Unirme al equipo</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}
