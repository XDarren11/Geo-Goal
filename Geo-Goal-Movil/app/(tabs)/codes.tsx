import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, ScrollView } from 'react-native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { getLeagues } from '@/Api/leagueAPI';
import { getMyTeams } from '@/Api/teamAPI';
import { generateLeagueInvitation, generateTeamInvitation, joinLeagueByCode, joinTeamByCode } from '@/Api/invitationAPI';
import Loader from '@/components/Loader';
import { Ionicons } from '@expo/vector-icons';
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
  // Search filters
  const [leagueSearch, setLeagueSearch] = useState('');
  const [teamSearch, setTeamSearch] = useState('');

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

  const filteredLeagues = useMemo(
    () =>
      leagueSearch.trim()
        ? leagues.filter((l) =>
            l.name.toLowerCase().includes(leagueSearch.trim().toLowerCase())
          )
        : leagues,
    [leagues, leagueSearch]
  );

  const filteredTeams = useMemo(
    () =>
      teamSearch.trim()
        ? teams.filter((t) =>
            t.name.toLowerCase().includes(teamSearch.trim().toLowerCase())
          )
        : teams,
    [teams, teamSearch]
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
    <ScrollView className="flex-1 bg-geo-black px-4 py-5">
      <Text className="text-gray-400 text-xs">Invitaciones</Text>
      <Text className="text-geo-green text-2xl font-extrabold">Códigos</Text>
      <Text className="text-gray-500 mt-1">Genera o usa códigos de invitación según tu rol.</Text>

      {role === 'admin' && (
        <View className="mt-5 rounded-2xl border border-geo-green/20 bg-gray-900/80 p-4">
          <Text className="text-white text-lg font-bold mb-3">Generar código de liga</Text>

          {/* Search filter */}
          <View className="flex-row items-center gap-2 rounded-xl border border-gray-700/60 bg-gray-800/60 px-3 py-2 mb-3">
            <Ionicons name="search" size={14} color="#6b7280" />
            <TextInput
              value={leagueSearch}
              onChangeText={setLeagueSearch}
              placeholder="Filtrar ligas…"
              placeholderTextColor="#6b7280"
              className="flex-1 text-white text-sm"
            />
            {leagueSearch ? (
              <TouchableOpacity onPress={() => setLeagueSearch('')}>
                <Ionicons name="close-circle" size={16} color="#6b7280" />
              </TouchableOpacity>
            ) : null}
          </View>

          {leaguesLoading ? (
            <Loader label="Cargando ligas..." />
          ) : (
            <FlatList
              scrollEnabled={false}
              data={filteredLeagues}
              keyExtractor={(item) => String(item.id)}
              ListEmptyComponent={
                <Text className="text-gray-500 text-sm text-center py-2">
                  No se encontraron ligas
                </Text>
              }
              renderItem={({ item }: { item: League }) => (
                <TouchableOpacity
                  onPress={() => setSelectedLeagueId(item.id)}
                  className={`mb-2 rounded-xl border px-4 py-3 ${selectedLeagueId === item.id ? 'border-geo-green bg-geo-green/10' : 'border-gray-700/80 bg-gray-800/80'}`}
                >
                  <View className="flex-row items-center gap-2">
                    <Ionicons
                      name="trophy-outline"
                      size={14}
                      color={selectedLeagueId === item.id ? '#39FF14' : '#6b7280'}
                    />
                    <Text className={`font-semibold flex-1 ${selectedLeagueId === item.id ? 'text-geo-green' : 'text-white'}`}>
                      {item.name}
                    </Text>
                    {selectedLeagueId === item.id && (
                      <Ionicons name="checkmark-circle" size={16} color="#39FF14" />
                    )}
                  </View>
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
            className="mt-3 rounded-xl border border-gray-700/80 bg-gray-800/80 px-4 py-3 text-white"
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
        <View className="mt-5 rounded-2xl border border-geo-green/20 bg-gray-900/80 p-4">
          <Text className="text-white text-lg font-bold mb-3">Código para tu equipo</Text>

          {/* Search filter */}
          <View className="flex-row items-center gap-2 rounded-xl border border-gray-700/60 bg-gray-800/60 px-3 py-2 mb-3">
            <Ionicons name="search" size={14} color="#6b7280" />
            <TextInput
              value={teamSearch}
              onChangeText={setTeamSearch}
              placeholder="Filtrar equipos…"
              placeholderTextColor="#6b7280"
              className="flex-1 text-white text-sm"
            />
            {teamSearch ? (
              <TouchableOpacity onPress={() => setTeamSearch('')}>
                <Ionicons name="close-circle" size={16} color="#6b7280" />
              </TouchableOpacity>
            ) : null}
          </View>

          {teamsLoading ? (
            <Loader label="Cargando equipos..." />
          ) : (
            <FlatList
              scrollEnabled={false}
              data={filteredTeams}
              keyExtractor={(item) => String(item.id)}
              ListEmptyComponent={
                <Text className="text-gray-500 text-sm text-center py-2">
                  No se encontraron equipos
                </Text>
              }
              renderItem={({ item }: { item: Team }) => (
                <TouchableOpacity
                  onPress={() => setSelectedTeamId(item.id)}
                  className={`mb-2 rounded-xl border px-4 py-3 ${selectedTeamId === item.id ? 'border-geo-green bg-geo-green/10' : 'border-gray-700/80 bg-gray-800/80'}`}
                >
                  <View className="flex-row items-center gap-2">
                    <Ionicons
                      name="shield-outline"
                      size={14}
                      color={selectedTeamId === item.id ? '#39FF14' : '#6b7280'}
                    />
                    <View className="flex-1">
                      <Text className={`font-semibold ${selectedTeamId === item.id ? 'text-geo-green' : 'text-white'}`}>
                        {item.name}
                      </Text>
                      <Text className="text-gray-400 text-xs mt-0.5">
                        {item.league?.name || 'Sin liga'}
                      </Text>
                    </View>
                    {selectedTeamId === item.id && (
                      <Ionicons name="checkmark-circle" size={16} color="#39FF14" />
                    )}
                  </View>
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
            className="mt-3 rounded-xl border border-gray-700/80 bg-gray-800/80 px-4 py-3 text-white"
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
        <View className="mt-5 rounded-2xl border border-geo-green/20 bg-gray-900/80 p-4">
          <Text className="text-white text-lg font-bold mb-3">
            {role === 'referee' ? 'Unirme a una liga como árbitro' : 'Unir tu equipo a una liga'}
          </Text>
          <TextInput
            value={leagueCode}
            onChangeText={(text) => setLeagueCode(text.toUpperCase())}
            placeholder="Código de liga"
            placeholderTextColor="#777"
            autoCapitalize="characters"
            className="rounded-xl border border-gray-700/80 bg-gray-800/80 px-4 py-3 text-white tracking-[6px]"
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
        <View className="mt-5 rounded-2xl border border-geo-green/20 bg-gray-900/80 p-4">
          <Text className="text-white text-lg font-bold mb-3">Unirse a un equipo</Text>
          <TextInput
            value={teamCode}
            onChangeText={(text) => setTeamCode(text.toUpperCase())}
            placeholder="Código del equipo"
            placeholderTextColor="#777"
            autoCapitalize="characters"
            className="rounded-xl border border-gray-700/80 bg-gray-800/80 px-4 py-3 text-white tracking-[6px]"
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
