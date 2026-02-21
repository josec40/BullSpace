import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Building2, MapPin, Users, ArrowLeft } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { buildingCoordinates } from '../data/coordinates';
import { useBookings } from '../context/BookingContext';

delete L.Icon.Default.prototype._getIconUrl;


const customIcon = new L.divIcon({
    className: 'custom-pin',
    html: `
        <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <g transform="translate(20, 35)">
                <!-- Pin shadow -->
                <ellipse cx="0" cy="2" rx="6" ry="2" fill="rgba(0,0,0,0.2)"/>
                <!-- Pin body -->
                <path d="M 0,-30 Q 10,-30 10,-20 Q 10,-10 0,0 Q -10,-10 -10,-20 Q -10,-30 0,-30 Z" 
                      fill="#DC2626" 
                      stroke="#991B1B" 
                      stroke-width="1.5"/>
                <!-- Pin highlight -->
                <circle cx="-3" cy="-23" r="3" fill="rgba(255,255,255,0.4)"/>
                <!-- Pin center dot -->
                <circle cx="0" cy="-20" r="5" fill="white"/>
            </g>
        </svg>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 35],
    popupAnchor: [0, -35]
});

const MapView = () => {
    const { rooms: roomsData } = useBookings();
    const [selectedBuilding, setSelectedBuilding] = useState(null);
    const roomsByBuilding = useMemo(() => {
        const grouped = {};
        roomsData.forEach(room => {
            if (!grouped[room.building]) {
                grouped[room.building] = [];
            }
            grouped[room.building].push(room);
        });
        return grouped;
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
            <header className="bg-emerald-600 shadow-lg sticky top-0 z-50">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <Link to="/" className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 font-bold text-xl shadow-lg">
                            B
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white tracking-tight leading-none">Bullspace</h1>
                            <p className="text-xs text-emerald-50 font-medium">USF Room Reservation</p>
                        </div>
                    </Link>
                    <Link
                        to="/"
                        className="inline-flex items-center text-white hover:text-emerald-100 transition-colors font-medium"
                    >
                        <ArrowLeft size={20} className="mr-2" />
                        Back to Dashboard
                    </Link>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-slate-800 mb-2 flex items-center gap-2">
                        <MapPin className="text-emerald-600" size={32} />
                        Campus Map
                    </h2>
                    <p className="text-slate-500">Click on a building marker to see available rooms</p>
                </div>

                <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
                    <MapContainer
                        center={[28.0630, -82.4145]}
                        zoom={16}
                        style={{ height: '600px', width: '100%' }}
                        className="z-0"
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        {Object.entries(buildingCoordinates).map(([buildingName, building]) => {
                            const rooms = roomsByBuilding[buildingName] || [];

                            return (
                                <Marker
                                    key={buildingName}
                                    position={building.coordinates}
                                    icon={customIcon}
                                    eventHandlers={{
                                        click: () => setSelectedBuilding(buildingName)
                                    }}
                                >
                                    <Popup maxWidth={350} minWidth={300}>
                                        <div className="p-2">
                                            {/* Building Header */}
                                            <div className="mb-4">
                                                <div className="flex items-start gap-3 mb-2">
                                                    <Building2 className="text-emerald-600 shrink-0 mt-1" size={24} />
                                                    <div>
                                                        <h3 className="text-lg font-bold text-slate-800 leading-tight">
                                                            {building.name}
                                                        </h3>
                                                        <p className="text-xs text-slate-500 mt-1">{building.address}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Room List */}
                                            <div className="border-t border-slate-200 pt-3">
                                                <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                                                    <Users size={14} className="text-emerald-600" />
                                                    Available Rooms ({rooms.length})
                                                </p>
                                                <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
                                                    {rooms.length > 0 ? (
                                                        rooms.map(room => (
                                                            <div
                                                                key={room.id}
                                                                className="bg-slate-50 rounded-lg p-3 hover:bg-indigo-50 transition-colors border border-slate-200"
                                                            >
                                                                <div className="flex justify-between items-start">
                                                                    <div>
                                                                        <p className="font-bold text-slate-800 text-sm">
                                                                            {room.name}
                                                                        </p>
                                                                        <p className="text-xs text-slate-500 mt-0.5">
                                                                            {room.type}
                                                                        </p>
                                                                    </div>
                                                                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md font-medium">
                                                                        {room.capacity} seats
                                                                    </span>
                                                                </div>
                                                                {room.features && room.features.length > 0 && (
                                                                    <p className="text-xs text-slate-600 mt-2">
                                                                        {room.features.join(' • ')}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p className="text-sm text-slate-500 italic">No rooms available in this building</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </Popup>
                                </Marker>
                            );
                        })}
                    </MapContainer>
                </div>

                {/* Info Cards */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.values(buildingCoordinates).map(building => {
                        const rooms = roomsByBuilding[building.name] || [];
                        return (
                            <div
                                key={building.name}
                                className="bg-white rounded-xl p-4 border border-slate-200 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                                        <Building2 className="text-emerald-600" size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-sm">{building.abbreviation}</h4>
                                        <p className="text-xs text-slate-500">{rooms.length} rooms</p>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-600 truncate">{building.name}</p>
                            </div>
                        );
                    })}
                </div>
            </main>
        </div>
    );
};

export default MapView;
