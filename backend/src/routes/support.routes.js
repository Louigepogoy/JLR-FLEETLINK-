const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  createTicket, getMyTickets, getTicketById, getAllTickets, respondToTicket, ticketValidation,
} = require('../controllers/supportController');

router.post('/', authenticate, ticketValidation, createTicket);
router.get('/mine', authenticate, getMyTickets);
router.get('/', authenticate, authorize('admin'), getAllTickets);
router.get('/:id', authenticate, getTicketById);
router.patch('/:id/respond', authenticate, authorize('admin'), respondToTicket);

module.exports = router;
