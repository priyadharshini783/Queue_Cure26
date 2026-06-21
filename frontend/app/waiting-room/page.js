// frontend/app/waiting-room/page.js
"use client";

import React, { useEffect, useState, useRef } from 'react';

export default function WaitingRoomPage() {
    const [state, setState] = useState({
        queue: [],
        currentToken: null,
        avgConsultTime: 15
    });

    const socketRef = useRef(null);

    useEffect(() => {
        const script = document.createElement('script');
        script.src = "https://cdn.socket.io/4.7.5/socket.io.min.js";
        script.async = true;

        script.onload = () => {
            if (window.io) {
                // Connect explicitly using pure websocket transport to avoid Turbopack interception
                socketRef.current = window.io('http://127.0.0.1:5000', {
                    transports: ['websocket'],
                    upgrade: false
                });

                socketRef.current.on('STATE_UPDATE', (updatedState) => {
                    setState(updatedState);
                });
                
                socketRef.current.on('connect_error', (err) => {
                    console.log("Waiting room link retry lifecycle:", err.message);
                });
            }
        };

        document.body.appendChild(script);

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
            document.body.removeChild(script);
        };
    }, []);

    return (
        <main className="min-h-screen bg-slate-900 text-white p-8 font-sans flex flex-col justify-between">
            <header className="flex justify-between items-center border-b border-slate-800 pb-4 mb-6">
                <div>
                    <h1 className="text-4xl font-extrabold text-indigo-400 tracking-tight">O P D  ——  Q U E U E</h1>
                    <p className="text-slate-400 text-sm mt-1">Live status screen. Synchronizing in real time.</p>
                </div>
                <div className="bg-slate-800 px-4 py-2 rounded-xl text-right border border-slate-700">
                    <span className="block text-xs uppercase tracking-wider text-slate-400 font-semibold">Clinic Metric Pace</span>
                    <span className="text-lg font-bold text-emerald-400">{state.avgConsultTime} mins/visit</span>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-grow mb-6">
                {/* Large Display Side: Now Serving */}
                <div className="lg:col-span-2 bg-gradient-to-br from-indigo-950 to-slate-950 rounded-2xl border border-indigo-800 p-8 flex flex-col justify-center items-center shadow-2xl relative overflow-hidden">
                    <span className="text-slate-400 text-xl font-medium tracking-wide mb-2 uppercase">Now Serving Token</span>
                    {state.currentToken ? (
                        <div className="text-center space-y-4">
                            <div className="text-9xl font-black text-white tracking-tighter">#{state.currentToken.tokenNumber}</div>
                            <div className="text-3xl font-semibold text-indigo-300">{state.currentToken.name}</div>
                        </div>
                    ) : (
                        <div className="text-slate-500 text-4xl italic font-light tracking-wide py-12">No Active Token Called</div>
                    )}
                </div>

                {/* Right Side Column: Upcoming Lineups */}
                <div className="bg-slate-950 rounded-2xl border border-slate-800 p-6 flex flex-col justify-between shadow-xl">
                    <div>
                        <h2 className="text-lg font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">Next in Line</h2>
                        {state.queue.length === 0 ? (
                            <div className="text-slate-600 italic text-center py-12 text-sm">Line is currently clear</div>
                        ) : (
                            <div className="space-y-3 max-h-[28rem] overflow-y-auto pr-1">
                                {state.queue.map((p, idx) => {
                                    const estimatedWait = (idx + 1) * state.avgConsultTime;
                                    return (
                                        <div key={p.id} className={`p-3 rounded-xl border flex justify-between items-center ${idx === 0 ? 'bg-indigo-950/40 border-indigo-500/50' : 'bg-slate-900 border-slate-800'}`}>
                                            <div>
                                                <div className="font-bold text-slate-200">{p.name}</div>
                                                <div className="text-xs text-slate-400 mt-0.5">Estimated Wait: <span className="text-amber-400 font-semibold">{estimatedWait} mins</span></div>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-lg font-black text-indigo-400">#{p.tokenNumber}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}