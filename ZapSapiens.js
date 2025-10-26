const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const fs = require('fs');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

const client = new Client();
const API_KEY = 'AIzaSyCZWZzE6sW5UgzPy_gyLJ0Svn2hJI311Qc'; // Substitua pela sua chave do Gemini
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

let botRunning = false;
let conversationHistory = [];

client.on('qr', qr => {
    console.log('QR Code gerado. Escaneie no WhatsApp:');
    qrcode.generate(qr, { small: true });
    fs.writeFileSync('qrcode.txt', qr); // Salva o QR como texto
    io.emit('log', 'QR Code gerado. Salvo em qrcode.txt. Escaneie manualmente.');
});

client.on('ready', () => {
    console.log('ZapSapiens pronto!');
    botRunning = true;
    io.emit('log', 'Bot conectado!');
    io.emit('status', { running: true });
});

client.on('message', async message => {
    io.emit('log', `Mensagem recebida: ${message.body || '[Imagem]'}`);
    
    // Lógica do bot (mesma do código anterior, simplificada para brevidade)
    let prompt = message.body || 'Analise a imagem.';
    // ... (insira a lógica completa de busca web, imagem e Gemini do código anterior aqui)
    
    try {
        const result = await model.generateContent(prompt);
        const reply = result.response.text();
        await message.reply(reply);
        io.emit('log', `Resposta: ${reply.substring(0, 100)}...`);
    } catch (error) {
        io.emit('log', 'Erro na IA: ' + error.message);
    }
});

io.on('connection', (socket) => {
    socket.emit('status', { running: botRunning });
    socket.on('start-bot', () => {
        if (!botRunning) {
            client.initialize();
            io.emit('log', 'Iniciando bot...');
        }
    });
    socket.on('stop-bot', () => {
        if (botRunning) {
            client.destroy();
            botRunning = false;
            io.emit('log', 'Bot parado.');
            io.emit('status', { running: false });
        }
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(3000, () => {
    console.log('Dashboard em http://localhost:3000');
});