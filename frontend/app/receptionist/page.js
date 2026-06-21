// frontend/app/receptionist/page.js
"use client";

import React, { useEffect, useState, useRef } from 'react';

export default function ReceptionistPage() {
    const [state, setState] = useState({
        queue: [],
        currentToken: null,
        tokenCounter: 1,
        avgConsultTime: 15
    });
    const [patientName, setPatientName] = useState('');
    const [inputConsultTime, setInputConsultTime] = useState('15');
    const [connectionStatus, setConnectionStatus] = useState('Initializing Ticker Script...');
    
    const socketRef = useRef(null);

    useEffect(() => {
        // Step A: Programmatically script mount the clean client socket payload
        const script = document.createElement('script');
        script.src = "https://cdn.socket.io/4.7.5/socket.io.min.js";
        script.async = true;

        script.onload = () => {
            setConnectionStatus('Script Mounted. Opening Loop...');
            
            if (window.io) {
                // Step B: Connect using strict standalone websocket pipeline
                socketRef.current = window.io('http://127.0.0.1:5000', {
                    transports: ['websocket'],
                    upgrade: false
                });

                socketRef.current.on('connect', () => {
                    setConnectionStatus('🟢 Real-Time Engine Connected!');
                });

                socketRef.current.on('connect_error', (err) => {
                    setConnectionStatus('⚡ Connection Retrying...');
                    console.log("Socket connection quiet log:", err.message);
                });

                socketRef.current.on('STATE_UPDATE', (updatedState) => {
                    setState(updatedState);
                    setInputConsultTime(updatedState.avgConsultTime.toString());
                });
            }
        };

        script.onerror = () => {
            setConnectionStatus('❌ Failed to mount connection engine.');
        };

        document.body.appendChild(script);

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
            document.body.removeChild(script);
        };
    }, []);

    const handleAddPatient = (e) => {
        e.preventDefault();
        if (!patientName.trim()) return;
        if (socketRef.current) {
            socketRef.current.emit('ADD_PATIENT', { name: patientName });
        }
        setPatientName('');
    };

    const handleCallNext = () => {
        if (socketRef.current) {
            socketRef.current.emit('CALL_NEXT');
        }
    };

    const handleTimeChange = (e) => {
        const val = e.target.value;
        setInputConsultTime(val);
        const parsed = parseInt(val, 10);
        if (!isNaN(parsed) && parsed > 0 && parsed <= 120) {
            if (socketRef.current) {
                socketRef.current.emit('UPDATE_CONSULT_TIME', parsed);
            }
        }
    };

    return (
        <main className="min-h-screen bg-slate-50 p-6 font-sans text-slate-900">
            <header className="mb-8 border-b border-slate-200 pb-4 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-indigo-700">Queue Cure '26 — Receptionist Control Panel</h1>
                    <p className="text-slate-600">Manage real-time entries, update system flow parameter, and call patient tokens.</p>
                </div>
                <div className="text-xs font-mono px-3 py-1.5 rounded-full bg-slate-200 text-slate-700 font-bold shadow-sm">
                    {connectionStatus}
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 1. Operational Controls */}
                <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit space-y-6">
                    <div>
                        <h2 className="text-xl font-semibold mb-4 text-slate-800">1. Operational Controls</h2>
                        <button
                            onClick={handleCallNext}
                            disabled={state.queue.length === 0}
                            className={`w-full py-4 text-center text-lg font-bold rounded-lg tracking-wide transition-all ${
                                state.queue.length === 0 
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md active:scale-95'
                            }`}
                        >
                            {state.queue.length === 0 ? 'Queue Empty' : '🔔 Call Next Token'}
                        </button>
                    </div>

                    <div className="border-t border-slate-100 pt-4">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Average Consultation Time (Minutes)</label>
                        <input
                            type="number"
                            min="1"
                            max="120"
                            value={inputConsultTime}
                            onChange={handleTimeChange}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none"
                        />
                    </div>
                </section>

                {/* 2. Register Patient */}
                <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
                    <h2 className="text-xl font-semibold mb-4 text-slate-800">2. Register Patient</h2>
                    <form onSubmit={handleAddPatient} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                            <input
                                type="text"
                                required
                                placeholder="Enter patient name..."
                                value={patientName}
                                onChange={(e) => setPatientName(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none"
                            />
                        </div>
                        <button type="submit" className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow">
                            Add to Queue List
                        </button>
                    </form>
                </section>

                {/* 3. Live System State */}
                <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h2 className="text-xl font-semibold mb-3 text-slate-800">3. Live System State</h2>
                    <div className="mb-4 p-4 rounded-lg bg-indigo-50 border border-indigo-100">
                        <span className="block text-xs font-semibold uppercase tracking-wider text-indigo-600">Currently Serving</span>
                        <div className="text-xl font-bold mt-1 text-slate-800">
                            {state.currentToken ? `Token #${state.currentToken.tokenNumber} — ${state.currentToken.name}` : 'None (Idle)'}
                        </div>
                    </div>

                    <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-2">Upcoming Queue ({state.queue.length})</h3>
                    {state.queue.length === 0 ? (
                        <p className="text-sm text-slate-400 italic py-4 text-center border-2 border-dashed border-slate-100 rounded-lg">No pending patients currently waiting</p>
                    ) : (
                        <ul className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                            {state.queue.map((p) => (
                                <li key={p.id} className="py-2 flex justify-between items-center text-sm">
                                    <span className="font-medium text-slate-700">{p.name}</span>
                                    <span className="bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded text-xs">Token #{p.tokenNumber}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </main>
    );
}