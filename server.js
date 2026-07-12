require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

// Import routes
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profiles');
const paymentRoutes = require('./routes/payments');
const chatRoutes = require('./routes/chats');
const adminRoutes = require('./routes/admin');
const smsRoutes = require('./routes/sms');
const dummyRoutes = require('./routes/dummy');

// Create express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => console.error('❌ MongoDB error:', err));

// Create HTTP server for Socket.IO
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('🔌 User connected:', socket.id);

  socket.on('join_chat', (userId) => {
    socket.join(userId.toString());
    console.log(`User ${userId} joined chat room`);
  });

  socket.on('send_message', async (data) => {
    try {
      const { chatId, senderId, receiverId, content, messageType, mediaUrl } = data;

      socket.to(receiverId.toString()).emit('receive_message', {
        chatId,
        senderId,
        content,
        messageType,
        mediaUrl,
        createdAt: new Date()
      });

      io.to(senderId.toString()).emit('message_sent', {
        chatId,
        content,
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Socket error:', error);
    }
  });

  socket.on('typing', (data) => {
    socket.to(data.receiverId.toString()).emit('user_typing', {
      userId: data.userId
    });
  });

  socket.on('stop_typing', (data) => {
    socket.to(data.receiverId.toString()).emit('user_stop_typing', {
      userId: data.userId
    });
  });

  socket.on('disconnect', () => {
    console.log('🔌 User disconnected:', socket.id);
  });
});

// Make io accessible to controllers
app.set('io', io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/dummy', dummyRoutes);

// Serve cached profile images
app.use('/cache', express.static(path.join(__dirname, 'public/cache')));

// Test Route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'ChatWazungu API is running! 💬',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 ChatWazungu server running on http://localhost:${PORT}`);
});

module.exports = { app, server, io };
