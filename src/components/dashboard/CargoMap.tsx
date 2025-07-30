import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Ship, MapPin, Clock, Thermometer } from 'lucide-react';

interface Cargo {
  id: string;
  numero: string;
  origem: { lat: number; lng: number; nome: string };
  destino: { lat: number; lng: number; nome: string };
  status: string;
  temperatura?: string;
  dataChegadaPrevista: string;
  sosVinculadas: number;
  mawb?: string;
  hawb?: string;
}

interface CargoMapProps {
  cargas: Cargo[];
  onCargoClick: (cargo: Cargo) => void;
}

const CargoMap: React.FC<CargoMapProps> = ({ cargas, onCargoClick }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(true);

  const initializeMap = (token: string) => {
    if (!mapContainer.current) return;

    mapboxgl.accessToken = token;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-30, 20],
      zoom: 2,
      projection: 'globe'
    });

    map.current.on('style.load', () => {
      map.current?.setFog({
        color: 'rgb(186, 210, 235)',
        'high-color': 'rgb(36, 92, 223)',
        'horizon-blend': 0.02,
        'space-color': 'rgb(11, 11, 25)',
        'star-intensity': 0.6
      });
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add cargo markers
    cargas.forEach(cargo => {
      if (!map.current) return;

      // Origin marker
      new mapboxgl.Marker({
        color: '#60A5FA',
        scale: 0.8
      })
        .setLngLat([cargo.origem.lng, cargo.origem.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 })
            .setHTML(`
              <div class="p-2">
                <h3 class="font-semibold">${cargo.origem.nome}</h3>
                <p class="text-sm">Origem - Carga ${cargo.numero}</p>
              </div>
            `)
        )
        .addTo(map.current);

      // Destination marker
      new mapboxgl.Marker({
        color: '#34D399',
        scale: 0.8
      })
        .setLngLat([cargo.destino.lng, cargo.destino.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 })
            .setHTML(`
              <div class="p-2">
                <h3 class="font-semibold">${cargo.destino.nome}</h3>
                <p class="text-sm">Destino - Carga ${cargo.numero}</p>
                <p class="text-xs">Chegada: ${new Date(cargo.dataChegadaPrevista).toLocaleDateString('pt-BR')}</p>
              </div>
            `)
        )
        .addTo(map.current);

      // Route line
      map.current.addSource(`route-${cargo.id}`, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: [
              [cargo.origem.lng, cargo.origem.lat],
              [cargo.destino.lng, cargo.destino.lat]
            ]
          }
        }
      });

      map.current.addLayer({
        id: `route-${cargo.id}`,
        type: 'line',
        source: `route-${cargo.id}`,
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#60A5FA',
          'line-width': 2,
          'line-dasharray': [2, 2]
        }
      });
    });
  };

  const handleTokenSubmit = () => {
    if (mapboxToken.trim()) {
      setShowTokenInput(false);
      initializeMap(mapboxToken);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cargo List */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ship className="h-5 w-5 text-primary" />
            Cargas em Trânsito ({cargas.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cargas.map(cargo => (
              <div 
                key={cargo.id}
                className="p-4 border rounded-lg hover:shadow-md transition-smooth cursor-pointer bg-card"
                onClick={() => onCargoClick(cargo)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold">Carga {cargo.numero}</h3>
                    <p className="text-sm text-muted-foreground">
                      {cargo.mawb && `MAWB: ${cargo.mawb}`}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {cargo.sosVinculadas} SOs
                  </Badge>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-status-shipping" />
                    <span>{cargo.origem.nome} → {cargo.destino.nome}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-status-transit" />
                    <span>Chegada: {new Date(cargo.dataChegadaPrevista).toLocaleDateString('pt-BR')}</span>
                  </div>
                  
                  {cargo.temperatura && (
                    <div className="flex items-center gap-2">
                      <Thermometer className="h-4 w-4 text-temp-cold" />
                      <span className="capitalize">{cargo.temperatura}</span>
                    </div>
                  )}
                </div>
                
                <Badge 
                  className="mt-3 w-full justify-center bg-status-transit text-status-transit-foreground"
                >
                  {cargo.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Map */}
      <Card className="shadow-map">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Mapa Global de Cargas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {showTokenInput ? (
            <div className="text-center py-12">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Configure o Mapbox</h3>
              <p className="text-muted-foreground mb-4">
                Insira seu token público do Mapbox para visualizar o mapa de cargas
              </p>
              <div className="max-w-md mx-auto flex gap-2">
                <Input
                  placeholder="pk.eyJ1Ijoi..."
                  value={mapboxToken}
                  onChange={(e) => setMapboxToken(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleTokenSubmit()}
                />
                <Button onClick={handleTokenSubmit}>
                  Conectar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Obtenha seu token em{' '}
                <a 
                  href="https://mapbox.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  mapbox.com
                </a>
              </p>
            </div>
          ) : (
            <div className="relative">
              <div 
                ref={mapContainer} 
                className="w-full h-96 rounded-lg shadow-lg"
              />
              <div className="absolute top-4 left-4 bg-card/90 backdrop-blur-sm p-3 rounded-lg shadow-lg">
                <div className="text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-status-shipping rounded-full"></div>
                    <span>Origem</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-status-delivered rounded-full"></div>
                    <span>Destino</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-0.5 bg-primary"></div>
                    <span>Rota</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CargoMap;