'use strict';
// Thin entry point — routes and logic live in routes/ and lib/.
const path = require('path');
const express = require('express');
const { attachSession } = require('./lib/auth');
const adminRoutes = require('./routes/admin');
const publicRoutes = require('./routes/public');

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));
app.use(attachSession);

// Admin first, so /admin always asks for the password before any static file is served.
app.use(adminRoutes);
app.use('/api', publicRoutes);
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

app.use((req, res) => res.status(404).sendFile(path.join(__dirname, 'public', '404.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Hillview Market & Deli site running on :${PORT}`));
