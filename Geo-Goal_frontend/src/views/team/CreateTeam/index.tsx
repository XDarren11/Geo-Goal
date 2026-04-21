import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { createTeam } from "@/api/teamAPI";
import { toast } from "react-toastify";
import ErrorMessage from "@/components/ErrorMessage";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

// Leaflet
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

type Form = {
  name: string;
  fieldAddress: string;
  lat: string;
  lng: string;
};

// Interfaces para la respuesta de Nominatim
interface SearchResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
}

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  map.setView(center, 16);
  return null;
}

function LocationMarker({ setValue, lat, lng }: { setValue: any, lat: string, lng: string }) {
  const [position, setPosition] = useState<L.LatLng | null>(
    lat && lng ? new L.LatLng(parseFloat(lat), parseFloat(lng)) : null
  );

  useEffect(() => {
    if (lat && lng) setPosition(new L.LatLng(parseFloat(lat), parseFloat(lng)));
  }, [lat, lng]);

  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      setValue("lat", e.latlng.lat.toString(), { shouldValidate: true });
      setValue("lng", e.latlng.lng.toString(), { shouldValidate: true });
    },
  });

  return position === null ? null : <Marker position={position} />;
}

export default function CreateTeamView() {
  const navigate = useNavigate();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // NUEVOS ESTADOS PARA LOS RESULTADOS
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [mapCenter, setMapCenter] = useState<[number, number]>([19.6018, -99.0436]);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<Form>({
    defaultValues: { name: "", fieldAddress: "", lat: "", lng: "" },
  });

  const latValue = watch("lat");
  const lngValue = watch("lng");

  const { mutate, isPending } = useMutation({
    mutationFn: createTeam,
    onError: (e) => toast.error(getApiErrorMessage(e, "No se pudo crear el equipo")),
    onSuccess: () => {
      toast.success("Equipo creado");
      navigate("/teams");
    },
  });

  // 1. FUNCIÓN DE BÚSQUEDA (Solo trae los resultados)
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`
      );
      const data = await response.json();
      
      if (data.length > 0) {
        setSearchResults(data); // Guardamos la lista de resultados
      } else {
        setSearchResults([]);
        toast.info("No se encontraron lugares con ese nombre");
      }
    } catch (error) {
      toast.error("Error al buscar la ubicación");
    } finally {
      setIsSearching(false);
    }
  };

  // 2. FUNCIÓN AL SELECCIONAR UN LUGAR DE LA LISTA
  const handleSelectLocation = (result: SearchResult) => {
    const newLat = parseFloat(result.lat);
    const newLng = parseFloat(result.lon);
    
    // Movemos el mapa
    setMapCenter([newLat, newLng]);
    
    // Llenamos el formulario invisible
    setValue("lat", newLat.toString(), { shouldValidate: true });
    setValue("lng", newLng.toString(), { shouldValidate: true });
    
    // Opcional: Autocompletar la dirección del campo con lo que dice el mapa
    setValue("fieldAddress", result.display_name.split(',')[0], { shouldValidate: true });

    // Limpiamos la búsqueda para cerrar el menú
    setSearchResults([]);
    setSearchQuery("");
  };

  function onSubmit(data: Form) {
    mutate({
      name: data.name,
      fieldAddress: data.fieldAddress,
      lat: parseFloat(data.lat),
      lng: parseFloat(data.lng),
      logo: logoFile || undefined,
    });
  }

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <Link to="/teams" className="text-sm font-medium text-[var(--geo-text-muted)] hover:text-geo-green transition-colors">
        &larr; Volver a equipos
      </Link>
      
      <h1 className="mt-4 text-4xl font-black text-[var(--geo-text)] tracking-tight">Crear equipo</h1>
      <p className="mt-2 text-[var(--geo-text-muted)]">Configura los detalles de tu equipo y su sede.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 grid grid-cols-1 gap-8">
        
        {/* Lado izquierdo: Datos básicos */}
        <div className="space-y-6 rounded-2xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-6 shadow-sm">
          <div>
            <label className="block text-sm font-bold text-[var(--geo-text)]">Nombre del equipo</label>
            <input
              type="text"
              placeholder="Ej: Halcones FC"
              className="mt-2 w-full rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg)] px-4 py-3 text-[var(--geo-text)] focus:border-geo-green focus:outline-none focus:ring-1 focus:ring-geo-green"
              {...register("name", { required: "El nombre es obligatorio" })}
            />
            {errors.name && <ErrorMessage>{errors.name.message}</ErrorMessage>}
          </div>

          <div>
            <label className="block text-sm font-bold text-[var(--geo-text)]">Dirección del campo</label>
            <input
              type="text"
              placeholder="Ej: Av. Principal 123"
              className="mt-2 w-full rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg)] px-4 py-3 text-[var(--geo-text)] focus:border-geo-green focus:outline-none focus:ring-1 focus:ring-geo-green"
              {...register("fieldAddress", { required: "La dirección es obligatoria" })}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-[var(--geo-text)]">Logo (Opcional)</label>
            <input
              type="file"
              accept="image/*"
              className="mt-2 block w-full text-sm text-[var(--geo-text-muted)] file:mr-4 file:rounded-full file:border-0 file:bg-geo-green/10 file:px-4 file:py-2 file:font-semibold file:text-geo-green hover:file:bg-geo-green/20"
              onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
            />
          </div>
        </div>

        {/* SECCIÓN DEL MAPA */}
        <div className="space-y-4 rounded-2xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-6 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 relative">
            <div>
              <label className="block text-sm font-bold text-[var(--geo-text)]">Ubicación del campo</label>
              <p className="text-xs text-[var(--geo-text-muted)]">Busca el lugar o selecciona directamente en el mapa</p>
            </div>
            
            {/* CONTENEDOR DE BÚSQUEDA (RELATIVE) */}
            <div className="flex w-full md:w-auto gap-2 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(e); } }}
                placeholder="Buscar ciudad, calle..."
                className="flex-1 md:w-72 rounded-lg border border-[var(--geo-border)] bg-[var(--geo-bg)] px-3 py-2 text-sm text-[var(--geo-text)] focus:outline-none focus:border-geo-green"
              />
              <button 
                type="button"
                onClick={handleSearch}
                disabled={isSearching}
                className="bg-geo-green px-4 py-2 rounded-lg text-xs font-bold text-geo-black hover:bg-[#32e512] disabled:opacity-50"
              >
                {isSearching ? "..." : "Buscar"}
              </button>

              {/* DROPDOWN DE RESULTADOS (ABSOLUTE) */}
              {searchResults.length > 0 && (
                <div className="absolute top-full right-0 mt-2 w-full md:w-96 max-h-60 overflow-y-auto bg-[var(--geo-bg-card)] border border-[var(--geo-border)] rounded-xl shadow-2xl z-[9999] divide-y divide-[var(--geo-border)]">
                  {/* Botón de cerrar la lista */}
                  <div className="sticky top-0 bg-[var(--geo-bg-card)] flex justify-between items-center p-2 border-b border-[var(--geo-border)]">
                    <span className="text-xs font-bold text-[var(--geo-text-muted)] px-2">Resultados ({searchResults.length})</span>
                    <button type="button" onClick={() => setSearchResults([])} className="text-red-500 hover:bg-red-500/10 p-1 rounded">✕</button>
                  </div>
                  
                  {/* Lista de lugares */}
                  {searchResults.map((result) => (
                    <div 
                      key={result.place_id} 
                      onClick={() => handleSelectLocation(result)}
                      className="p-3 hover:bg-[var(--geo-bg)] cursor-pointer transition-colors"
                    >
                      <p className="text-sm font-semibold text-[var(--geo-text)] line-clamp-1">{result.display_name.split(',')[0]}</p>
                      <p className="text-xs text-[var(--geo-text-muted)] line-clamp-2 mt-1">{result.display_name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="h-[500px] w-full overflow-hidden rounded-xl border border-[var(--geo-border)] relative z-0">
            <MapContainer center={mapCenter} zoom={12} style={{ height: "100%", width: "100%" }}>
              <ChangeView center={mapCenter} />
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <LocationMarker setValue={setValue} lat={latValue} lng={lngValue} />
            </MapContainer>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[var(--geo-bg)] p-2 rounded border border-[var(--geo-border)] text-center">
              <span className="text-[10px] text-[var(--geo-text-muted)] uppercase block">Latitud</span>
              <span className="text-sm font-mono text-[var(--geo-text)]">{latValue || "---"}</span>
            </div>
            <div className="bg-[var(--geo-bg)] p-2 rounded border border-[var(--geo-border)] text-center">
              <span className="text-[10px] text-[var(--geo-text-muted)] uppercase block">Longitud</span>
              <span className="text-sm font-mono text-[var(--geo-text)]">{lngValue || "---"}</span>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-xl bg-geo-green py-4 font-black text-geo-black hover:bg-[#32e512] disabled:opacity-60 transition-all text-lg shadow-lg"
        >
          {isPending ? "Procesando..." : "Registrar Equipo"}
        </button>
      </form>
    </div>
  );
}