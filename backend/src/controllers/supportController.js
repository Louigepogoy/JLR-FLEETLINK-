const { body, validationResult } = require('express-validator');
const { query } = require('../config/db');
const { createNotification } = require('../utils/notifications');

const createTicket = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { subject, message } = req.body;
    const result = await query(
      `INSERT INTO support_tickets (user_id, subject, message)
       VALUES ($1, $2, $3) RETURNING *`,
      [req.user.id, subject.trim(), message.trim()]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

const getMyTickets = async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM support_tickets WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

const getTicketById = async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM support_tickets WHERE id = $1', [req.params.id]);
    const ticket = result.rows[0];
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }
    if (ticket.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    res.json({ success: true, data: ticket });
  } catch (error) {
    next(error);
  }
};

const getAllTickets = async (req, res, next) => {
  try {
    const { status } = req.query;
    const params = [];
    let sql = `
      SELECT t.*, u.full_name as user_name, u.email as user_email
      FROM support_tickets t
      JOIN users u ON t.user_id = u.id
    `;
    if (status) {
      sql += ' WHERE t.status = $1';
      params.push(status);
    }
    sql += ' ORDER BY (t.status = \'open\') DESC, t.created_at ASC';

    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

const respondToTicket = async (req, res, next) => {
  try {
    const { response, status } = req.body;
    const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    if (!response?.trim()) {
      return res.status(400).json({ success: false, message: 'A response message is required' });
    }

    const ticket = await query('SELECT id, user_id, subject FROM support_tickets WHERE id = $1', [req.params.id]);
    if (!ticket.rows[0]) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    const result = await query(
      `UPDATE support_tickets SET
         admin_response = $1, status = $2, responded_by = $3, responded_at = NOW(), updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [response.trim(), status, req.user.id, req.params.id]
    );

    await createNotification(
      ticket.rows[0].user_id,
      `Support Ticket Updated: ${ticket.rows[0].subject}`,
      response.trim(),
      'system',
      '/dashboard/support'
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

const ticketValidation = [
  body('subject').trim().notEmpty().withMessage('Subject is required').isLength({ max: 255 }),
  body('message').trim().notEmpty().withMessage('Message is required').isLength({ max: 5000 }),
];

module.exports = {
  createTicket, getMyTickets, getTicketById, getAllTickets, respondToTicket, ticketValidation,
};
