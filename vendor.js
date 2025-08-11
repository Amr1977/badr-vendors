// vendor.js
const express = require('express');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const axios = require('axios');
const app = express();
app.use(express.json());

// PostgreSQL connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'badr_dp',
  password: 'yourpassword', // Replace with your DB password
  port: 5432,
});

// Multer for image uploads
const storage = multer.diskStorage({
  destination: './uploads/images',
  filename: (req, file, cb) => {
    cb(null, `item-${Date.now()}${path.extname(file.originalname)}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) return cb(null, true);
    cb(new Error('Images only (JPEG/PNG)'));
  },
});

// JWT middleware
const checkRole = (requiredRole) => (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    const user = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    if (!user.roles.includes(requiredRole)) {
      return res.status(403).json({ error: `${requiredRole} role required` });
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Notify consumers via webhook
async function notifyConsumers(data, type) {
  const webhookUrls = ['http://badr_dp.ddns.net/webhook']; // Replace with actual URLs
  for (const url of webhookUrls) {
    try {
      await axios.post(url, { data, type });
    } catch (err) {
      console.error(`Webhook failed for ${url}: ${err.message}`);
    }
  }
}

// Register vendor
app.post('/vendors/register', checkRole('vendor'), async (req, res) => {
  const { name, commercial_registration } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO vendors (user_id, name, commercial_registration, registration_status) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.id, name, commercial_registration, 'pending']
    );
    await notifyConsumers(result.rows[0], 'vendor_registered');
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin approve/reject vendor
app.put('/vendors/:vendorId/approve', checkRole('admin'), async (req, res) => {
  const { vendorId } = req.params;
  const { status } = req.body; // 'approved' or 'rejected'
  try {
    const result = await pool.query(
      'UPDATE vendors SET registration_status = $1 WHERE id = $2 RETURNING *',
      [status, vendorId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Vendor not found' });
    await notifyConsumers(result.rows[0], 'vendor_status_updated');
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create branch
app.post('/vendors/:vendorId/branches', checkRole('vendor'), async (req, res) => {
  const { vendorId } = req.params;
  const { name, address } = req.body;
  try {
    const vendorCheck = await pool.query('SELECT * FROM vendors WHERE id = $1 AND user_id = $2 AND registration_status = $3', [vendorId, req.user.id, 'approved']);
    if (vendorCheck.rows.length === 0) return res.status(403).json({ error: 'Unauthorized or unapproved vendor' });
    const result = await pool.query(
      'INSERT INTO vendor_branches (vendor_id, name, address) VALUES ($1, $2, $3) RETURNING *',
      [vendorId, name, address]
    );
    await notifyConsumers(result.rows[0], 'branch_added');
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create menu item
app.post('/vendors/:vendorId/branches/:branchId/menu', checkRole('vendor'), upload.single('image'), async (req, res) => {
  const { vendorId, branchId } = req.params;
  const { name, price, description } = req.body;
  const imagePath = req.file ? `/uploads/images/${req.file.filename}` : null;
  try {
    const vendorCheck = await pool.query('SELECT * FROM vendors WHERE id = $1 AND user_id = $2 AND registration_status = $3', [vendorId, req.user.id, 'approved']);
    if (vendorCheck.rows.length === 0) return res.status(403).json({ error: 'Unauthorized or unapproved vendor' });
    const branchCheck = await pool.query('SELECT * FROM vendor_branches WHERE id = $1 AND vendor_id = $2', [branchId, vendorId]);
    if (branchCheck.rows.length === 0) return res.status(404).json({ error: 'Branch not found' });
    const result = await pool.query(
      'INSERT INTO menu_items (branch_id, name, price, description, image_path) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [branchId, name, price, description, imagePath]
    );
    await notifyConsumers(result.rows[0], 'menu_item_added');
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create offer
app.post('/vendors/:vendorId/branches/:branchId/offers', checkRole('vendor'), async (req, res) => {
  const { vendorId, branchId } = req.params;
  const { title, description, discount_percentage, start_date, end_date } = req.body;
  try {
    const vendorCheck = await pool.query('SELECT * FROM vendors WHERE id = $1 AND user_id = $2 AND registration_status = $3', [vendorId, req.user.id, 'approved']);
    if (vendorCheck.rows.length === 0) return res.status(403).json({ error: 'Unauthorized or unapproved vendor' });
    const branchCheck = await pool.query('SELECT * FROM vendor_branches WHERE id = $1 AND vendor_id = $2', [branchId, vendorId]);
    if (branchCheck.rows.length === 0) return res.status(404).json({ error: 'Branch not found' });
    const result = await pool.query(
      'INSERT INTO offers (branch_id, title, description, discount_percentage, start_date, end_date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [branchId, title, description, discount_percentage, start_date, end_date]
    );
    await notifyConsumers(result.rows[0], 'offer_added');
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Customer view menus with filters/search
app.get('/branches/:branchId/menu', async (req, res) => {
  const { branchId } = req.params;
  const { search, minPrice, maxPrice } = req.query;
  try {
    let query = 'SELECT * FROM menu_items WHERE branch_id = $1';
    const params = [branchId];
    if (search) {
      query += ' AND (name ILIKE $2 OR description ILIKE $2)';
      params.push(`%${search}%`);
    }
    if (minPrice) {
      query += ` AND price >= $${params.length + 1}`;
      params.push(minPrice);
    }
    if (maxPrice) {
      query += ` AND price <= $${params.length + 1}`;
      params.push(maxPrice);
    }
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Customer view offers
app.get('/branches/:branchId/offers', async (req, res) => {
  const { branchId } = req.params;
  try {
    const result = await pool.query('SELECT * FROM offers WHERE branch_id = $1 AND end_date > NOW()', [branchId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Customer favorite vendor/branch/menu item/offer
app.post('/favorites', checkRole('customer'), async (req, res) => {
  const { branch_id, menu_item_id, offer_id, type } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO favorites (user_id, branch_id, menu_item_id, offer_id, type) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.user.id, branch_id, menu_item_id, offer_id, type]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Customer post review
app.post('/reviews', checkRole('customer'), async (req, res) => {
  const { branch_id, menu_item_id, offer_id, rating, comment, type } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO reviews (user_id, branch_id, menu_item_id, offer_id, rating, comment, type) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [req.user.id, branch_id, menu_item_id, offer_id, rating, comment, type]
    );
    await notifyConsumers(result.rows[0], 'review_added');
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Customer edit review
app.put('/reviews/:reviewId', checkRole('customer'), async (req, res) => {
  const { reviewId } = req.params;
  const { rating, comment } = req.body;
  try {
    const result = await pool.query(
      'UPDATE reviews SET rating = $1, comment = $2 WHERE id = $3 AND user_id = $4 RETURNING *',
      [rating, comment, reviewId, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Review not found or unauthorized' });
    await notifyConsumers(result.rows[0], 'review_updated');
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Customer delete review
app.delete('/reviews/:reviewId', checkRole('customer'), async (req, res) => {
  const { reviewId } = req.params;
  try {
    const result = await pool.query('DELETE FROM reviews WHERE id = $1 AND user_id = $2 RETURNING *', [reviewId, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Review not found or unauthorized' });
    await notifyConsumers({ reviewId }, 'review_deleted');
    res.json({ message: 'Review deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Vendor/customer reply to review
app.post('/reviews/:reviewId/replies', checkRole(['vendor', 'customer']), async (req, res) => {
  const { reviewId } = req.params;
  const { comment } = req.body;
  try {
    const reviewCheck = await pool.query('SELECT * FROM reviews WHERE id = $1', [reviewId]);
    if (reviewCheck.rows.length === 0) return res.status(404).json({ error: 'Review not found' });
    if (req.user.roles.includes('vendor')) {
      const vendorCheck = await pool.query(
        'SELECT v.* FROM vendors v JOIN vendor_branches vb ON v.id = vb.vendor_id JOIN reviews r ON vb.id = r.branch_id WHERE r.id = $1 AND v.user_id = $2',
        [reviewId, req.user.id]
      );
      if (vendorCheck.rows.length === 0) return res.status(403).json({ error: 'Unauthorized vendor' });
    }
    const result = await pool.query(
      'INSERT INTO review_replies (review_id, user_id, comment) VALUES ($1, $2, $3) RETURNING *',
      [reviewId, req.user.id, comment]
    );
    await notifyConsumers(result.rows[0], 'review_reply_added');
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Customer like/dislike review
app.post('/reviews/:reviewId/like', checkRole('customer'), async (req, res) => {
  const { reviewId } = req.params;
  const { is_like } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO review_likes (review_id, user_id, is_like) VALUES ($1, $2, $3) ON CONFLICT (review_id, user_id) DO UPDATE SET is_like = $3 RETURNING *',
      [reviewId, req.user.id, is_like]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3001, () => console.log('Vendor microservice running on port 3001'));