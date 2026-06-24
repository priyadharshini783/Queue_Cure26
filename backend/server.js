const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allows quick local testing and cross-origin deployment
        methods: ["GET", "POST"]
    }
});

// Centralized System State (In-Memory Source of Truth)
let state = {
    queue: [],              // Array of patient objects: { id, name, tokenNumber, severity }
    currentToken: null,     // The token currently being treated
    tokenCounter: 1,        // Auto-incrementing token generator
    avgConsultTime: 15,     // Dynamic variable handled by receptionist (in minutes)
    totalServed: 0,         // Cumulative counter for analytics metric
    peakVolume: 0           // Tracks peak crowd boundary dynamically
};

io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);
    
    // 1. Send the instant absolute state the moment a client opens the tab
    socket.emit('STATE_UPDATE', state);

    // 2. Action: Add Patient to Queue with Smart Triage
    socket.on('ADD_PATIENT', (data) => {
        if (!data.name || data.name.trim() === "") return;
        
        // Simulating an AI Triage classification engine allocation
        const severities = ["Critical", "Urgent", "Routine"];
        const randomSeverity = severities[Math.floor(Math.random() * severities.length)];
        
        const newPatient = {
            id: Date.now().toString(),
            name: data.name.trim(),
            tokenNumber: state.tokenCounter++,
            severity: randomSeverity // Appending triage metadata
        };
        
        state.queue.push(newPatient);
        
        // Dynamically compute and adjust Peak Crowd Volume metric
        if (state.queue.length > state.peakVolume) {
            state.peakVolume = state.queue.length;
        }
        
        // Broadcast structural update to everyone instantly
        io.emit('STATE_UPDATE', state);
    });

    // Action handler: Bulk populate mock patients for lightning-fast presentation demos
    socket.on('MOCK_DATA', () => {
        const mockPatients = [
            { name: "Adhithya Kumar", severity: "Critical" },
            { name: "Priya Sharma", severity: "Urgent" },
            { name: "Rahul Dravid", severity: "Routine" },
            { name: "Sneha Reddy", severity: "Urgent" },
            { name: "Vikram Seth", severity: "Routine" }
        ];
        
        mockPatients.forEach(item => {
            const mockPatient = {
                id: (Date.now() + Math.random()).toString(), // Unique ID generation
                name: item.name,
                tokenNumber: state.tokenCounter++,
                severity: item.severity // Match designated test case severity
            };
            state.queue.push(mockPatient);
        });

        // Recalculate peak metrics boundary following bulk dump
        if (state.queue.length > state.peakVolume) {
            state.peakVolume = state.queue.length;
        }

        io.emit('STATE_UPDATE', state); // Broadcast the populated queue globally instantly
    });

    // 3. Action: Call Next Patient (Concurrency protected via atomic .shift())
    socket.on('CALL_NEXT', () => {
        if (state.queue.length > 0) {
            state.currentToken = state.queue.shift(); // Atomic extraction
            state.totalServed++; // Safely increment cumulative throughput tally counter
        } else {
            state.currentToken = null; // Queue is empty
        }
        io.emit('STATE_UPDATE', state);
    });

    // 4. Action: Update Avg Consultation Time
    socket.on('UPDATE_CONSULT_TIME', (time) => {
        const parsedTime = parseInt(time);
        if (!isNaN(parsedTime) && parsedTime > 0) {
            state.avgConsultTime = parsedTime;
            io.emit('STATE_UPDATE', state);
        }
    });

    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Queue Engine running on port ${PORT}`);
});