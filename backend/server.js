const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});


app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

const authenticateJWT = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1];
  if (!token) {
    return res.sendStatus(403);
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.sendStatus(403);
    }
    req.user = user;
    next();
  });
};

// Register route
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    const result = await pool.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *',
      [username, email, hashedPassword]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Login route
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(400).json({ error: 'User not found' });

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: 'Invalid password' });

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Get notes route
app.get('/notes', authenticateJWT, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM notes WHERE user_id = $1', [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Create note route
app.post('/notes', authenticateJWT, async (req, res) => {
  const { title, content } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO notes (user_id, title, content) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, title, content]
    );
    const newNote = result.rows[0];
    io.emit('note_created', newNote);  
    res.status(201).json(newNote);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Edit note route
app.put('/notes/:id', authenticateJWT, async (req, res) => {
  const { title, content } = req.body;
  const { id } = req.params;
  try {
    const result = await pool.query(
      'UPDATE notes SET title = $1, content = $2 WHERE id = $3 AND user_id = $4 RETURNING *',
      [title, content, id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Note not found' });

    const updatedNote = result.rows[0];
    io.emit('note_updated', updatedNote);  
    res.json(updatedNote);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Delete note route
app.delete('/notes/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM notes WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Note not found' });

    const deletedNote = result.rows[0];
    io.emit('note_deleted', deletedNote);  // Emit event to all connected users
    res.json(deletedNote);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// WebSocket connection
io.on('connection', (socket) => {
  console.log('A user connected');
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

server.listen(process.env.PORT || 3000, () => {
  console.log('Server is running');
});


