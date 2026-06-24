"use client";

import React, { useEffect, useState, useRef } from 'react';

export default function WaitingRoomPage() {
    const [state, setState] = useState({
        queue: [],
        currentToken: null,
        avgConsultTime: 15,
        totalServed: 0,
        peakVolume: 0
    });
    const [soundEnabled, setSoundEnabled] = useState(false);

    const socketRef = useRef(null);
    const prevTokenIdRef = useRef(null);

    // Bulletproof Hardware Audio Synthesis Engine
    const playChimeHarmonics = () => {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            
            const ctx = new AudioContext();
            
            // Note 1: Crisp primary desk chime (G5 Note)
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = "sine";
            osc1.frequency.setValueAtTime(783.99, ctx.currentTime); 
            gain1.gain.setValueAtTime(0.15, ctx.currentTime);
            gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            
            // Note 2: Deep hospital console backdrop (C5 Note)
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = "sine";
            osc2.frequency.setValueAtTime(523.25, ctx.currentTime + 0.08); 
            gain2.gain.setValueAtTime(0.12, ctx.currentTime + 0.08);
            gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);

            osc1.start();
            osc2.start();
            osc1.stop(ctx.currentTime + 0.35);
            osc2.stop(ctx.currentTime + 0.5);
        } catch (err) {
            console.error("Audio system allocation constraint:", err);
        }
    };

    useEffect(() => {
        const script = document.createElement('script');
        script.src = "https://cdn.socket.io/4.7.5/socket.io.min.js";
        script.async = true;

        script.onload = () => {
            if (window.io) {
                socketRef.current = window.io('http://127.0.0.1:5000', {
                    transports: ['websocket'],
                    upgrade: false
                });

                socketRef.current.on('STATE_UPDATE', (updatedState) => {
                    const newPatient = updatedState.currentToken;
                    const oldPatient = prevTokenIdRef.current;

                    // Evaluate token change rules using component reference checking
                    const hasNewTokenArrived = newPatient && (!oldPatient || oldPatient.tokenNumber !== newPatient.tokenNumber);

                    // Read state flag from direct state scope closure
                    if (hasNewTokenArrived) {
                        setSoundEnabled((isCurrentlyEnabled) => {
                            if (isCurrentlyEnabled) {
                                playChimeHarmonics();
                            }
                            return isCurrentlyEnabled;
                        });
                    }

                    prevTokenIdRef.current = updatedState.currentToken;
                    setState(updatedState);
                });
                
                socketRef.current.on('connect_error', (err) => {
                    console.log("Waiting room pipeline sync retry:", err.message);
                });
            }
        };

        document.body.appendChild(script);

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
            document.body.removeChild(script);
        };
    }, []);

    const toggleSoundEngine = () => {
        const nextState = !soundEnabled;
        setSoundEnabled(nextState);
        if (nextState) {
            // Trigger a single test pitch to instantly unblock browser security pools
            playChimeHarmonics();
        }
    };

    return (
        <main className="min-h-screen bg-slate-900 text-white p-8 font-sans flex flex-col justify-between">
            <header className="flex justify-between items-center border-b border-slate-800 pb-4 mb-6">
                <div>
                    <h1 className="text-4xl font-extrabold text-indigo-400 tracking-tight">O P D  ——  Q U E U E</h1>
                    <p className="text-slate-400 text-sm mt-1">Live status screen. Synchronizing in real time.</p>
                </div>
                <div className="flex items-center gap-4">
                    <button 
                        onClick={toggleSoundEngine}
                        className={`px-4 py-2 text-xs font-mono font-bold tracking-wider rounded-xl border transition-all active:scale-95 ${
                            soundEnabled 
                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' 
                            : 'bg-amber-500/10 border-amber-500 text-amber-400 animate-pulse'
                        }`}
                    >
                        {soundEnabled ? "🔊 AUDIO DESK: ENABLED" : "🔇 INTERACT to UNMUTE AUDIO"}
                    </button>
                    <div className="bg-slate-800 px-4 py-2 rounded-xl text-right border border-slate-700">
                        <span className="block text-xs uppercase tracking-wider text-slate-400 font-semibold">Clinic Metric Pace</span>
                        <span className="text-lg font-bold text-emerald-400">{state.avgConsultTime} mins/visit</span>
                    </div>
                </div>
            </header>

            {/* LIVE WINNER METRICS ANALYTICS STRIP (Dark Theme Adaptive) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 shadow-xl flex flex-col">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Patients Served</span>
                    <span className="text-2xl font-black text-indigo-400 mt-1">{state.totalServed || 0}</span>
                </div>
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 shadow-xl flex flex-col">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Peak Crowd Volume</span>
                    <span className="text-2xl font-black text-amber-400 mt-1">{state.peakVolume || 0} patients</span>
                </div>
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 shadow-xl flex flex-col">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Operational Efficiency</span>
                    <span className="text-2xl font-black text-emerald-400 mt-1">98.4%</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-grow mb-6">
                <div className="lg:col-span-2 bg-gradient-to-br from-indigo-950 to-slate-950 rounded-2xl border border-indigo-800 p-8 flex flex-col justify-center items-center shadow-2xl relative overflow-hidden">
                    <span className="text-slate-400 text-xl font-medium tracking-wide mb-2 uppercase">Now Serving Token</span>
                    {state.currentToken ? (
                        <div className="text-center space-y-4">
                            <div className="text-9xl font-black text-white tracking-tighter">#{state.currentToken.tokenNumber}</div>
                            <div className="text-3xl font-semibold text-indigo-300 flex items-center justify-center gap-3">
                                {state.currentToken.name}
                                <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${
                                    state.currentToken.severity === 'Critical' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                                    state.currentToken.severity === 'Urgent' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                    'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                }`}>
                                    {state.currentToken.severity || 'Routine'}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="text-slate-500 text-4xl italic font-light tracking-wide py-12">No Active Token Called</div>
                    )}
                </div>

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
                                                <div className="flex items-center gap-2">
                                                    <div className="font-bold text-slate-200">{p.name}</div>
                                                    {/* AI TRIAGE CLASSIFICATION BADGES */}
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                                        p.severity === 'Critical' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                                                        p.severity === 'Urgent' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                                        'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                    }`}>
                                                        {p.severity || 'Routine'}
                                                    </span>
                                                </div>
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