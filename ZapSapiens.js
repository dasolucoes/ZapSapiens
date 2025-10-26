const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai'); // Importação correta

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

const client = new Client();
const API_KEY = process.env.API_KEY; // Usa variável de ambiente do Render
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

let qrImagePath = null;
let isQrScanned = false;

client.on('qr', async (qr) => {
    console.log('QR Code gerado. Escaneie no WhatsApp.');
    qrImagePath = path.join(__dirname, 'qrcode.png');
    await qrcode.toFile(qrImagePath, qr); // Gera imagem PNG
    io.emit('qr', '/qrcode.png'); // Envia caminho para o dashboard
});

client.on('ready', () => {
    console.log('ZapSapiens pronto!');
    isQrScanned = true;
    if (qrImagePath && fs.existsSync(qrImagePath)) {
        fs.unlinkSync(qrImagePath); // Remove QR após escaneamento
    }
    io.emit('status', { running: true });
    io.emit('qr', null); // Remove QR do dashboard
});

client.on('message', async (message) => {
    io.emit('log', `Mensagem recebida: ${message.body || '[Imagem]'}`);
    let prompt = message.body || 'Analise a imagem.';
    // (Lógica de processamento como no código anterior, simplificada aqui)
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
    socket.emit('status', { running: client.initialized });
    socket.emit('qr', qrImagePath ? '/qrcode.png' : null);
    socket.on('start-bot', () => {
        if (!client.initialized) client.initialize();
    });
    socket.on('stop-bot', () => {
        if (client.initialized) client.destroy();
    });
});

app.get('/qrcode.png', (req, res) => {
    if (qrImagePath && fs.existsSync(qrImagePath)) {
        res.sendFile(qrImagePath);
    } else {
        res.status(404).send('QR Code não disponível.');
    }
});

server.listen(3000, () => {
    console.log('Dashboard em http://localhost:3000');
});

client.initialize();