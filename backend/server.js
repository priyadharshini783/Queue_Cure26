// backend/server.js
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
    queue: [],              // Array of patient objects: { id, name, tokenNumber }
    currentToken: null,     // The token currently being treated
    tokenCounter: 1,        // Auto-incrementing token generator
    avgConsultTime: 15      // Dynamic variable handled by receptionist (in minutes)
};

io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);
    
    // 1. Send the instant absolute state the moment a client opens the tab
    socket.emit('STATE_UPDATE', state);

    // 2. Action: Add Patient to Queue
    socket.on('ADD_PATIENT', (data) => {
        if (!data.name || data.name.trim() === "") return;
        
        const newPatient = {
            id: Date.now().toString(),
            name: data.name.trim(),
            tokenNumber: state.tokenCounter++
        };
        
        state.queue.push(newPatient);
        
        // Broadcast structural update to everyone instantly
        io.emit('STATE_UPDATE', state);
    });

    // 3. Action: Call Next Patient (Concurrency protected via atomic .shift())
    socket.on('CALL_NEXT', () => {
        if (state.queue.length > 0) {
            state.currentToken = state.queue.shift(); // Atomic extraction
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