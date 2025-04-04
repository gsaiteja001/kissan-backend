const express = require('express');
const FarmersTicket = require('../modal/FarmersTicket'); // Assuming the schema is saved as FarmersTicket.js

const router = express.Router();



// Get all tickets
router.get('/all', async (req, res) => {
  try {
    // Fetch all tickets from the database
    const tickets = await FarmersTicket.find({});

    if (tickets.length === 0) {
      return res.status(404).json({ message: 'No tickets found' });
    }

    res.status(200).json({ tickets });
  } catch (error) {
    console.error('Error fetching all tickets:', error);
    res.status(500).json({ message: 'An error occurred while fetching tickets.' });
  }
});



// Get tickets by assignedAgentId or all tickets if user is a supportAdmin
router.get('/tickets', async (req, res) => {
  try {
    // Get assignedAgentId from query parameters
    const { assignedAgentId } = req.query;

    // Find the current logged-in user (assuming you have a way to get the current user from the session or token)
    const currentUser = req.user; // Assuming `req.user` contains the logged-in user details

    // If the user has 'supportAdmin' role, return all tickets
    if (currentUser.userRoles && currentUser.userRoles.includes('supportAdmin')) {
      const allTickets = await FarmersTicket.find();
      return res.status(200).json({ tickets: allTickets });
    }

    // If assignedAgentId is provided and the user is not a supportAdmin, fetch tickets assigned to the specified agentId
    if (assignedAgentId) {
      const ticketsByAgent = await FarmersTicket.find({ 'assignedAgent.agentId': assignedAgentId });

      if (!ticketsByAgent || ticketsByAgent.length === 0) {
        return res.status(404).json({ message: 'No tickets found for this agent' });
      }

      return res.status(200).json({ tickets: ticketsByAgent });
    }

    // If no assignedAgentId is provided and the user is not a supportAdmin, return an error or specific behavior
    return res.status(400).json({ message: 'Assigned agent ID is required' });

  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ message: 'An error occurred while fetching tickets.' });
  }
});




// Bulk upload API endpoint
router.post('/bulk-upload', async (req, res) => {
  const tickets = req.body.tickets;

  if (!tickets || !Array.isArray(tickets)) {
    return res.status(400).json({ message: 'Invalid data format. Expected an array of tickets.' });
  }

  try {
    // Bulk insert tickets into the database
    const insertedTickets = await FarmersTicket.insertMany(tickets);
    res.status(201).json({
      message: `${insertedTickets.length} tickets successfully uploaded.`,
      tickets: insertedTickets,
    });
  } catch (error) {
    console.error('Error uploading tickets:', error);
    res.status(500).json({ message: 'An error occurred while uploading tickets.' });
  }
});

// Get a ticket by ticketId
router.get('/:ticketId', async (req, res) => {
  try {
    const ticket = await FarmersTicket.findOne({ ticketId: req.params.ticketId });
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    res.status(200).json(ticket);
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ message: 'An error occurred while fetching the ticket.' });
  }
});

// Update a ticket by ticketId
router.put('/:ticketId', async (req, res) => {
  const { ticketId } = req.params;
  const { category, subcategory, status, priority, issueDescription, feedback, assignedAgent } = req.body;

  try {
    const updatedTicket = await FarmersTicket.findOneAndUpdate(
      { ticketId },
      { category, subcategory, status, priority, issueDescription, feedback, assignedAgent },
      { new: true } // Returns the updated ticket
    );

    if (!updatedTicket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    res.status(200).json({
      message: 'Ticket successfully updated',
      ticket: updatedTicket,
    });
  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(500).json({ message: 'An error occurred while updating the ticket.' });
  }
});

// Delete a ticket by ticketId
router.delete('/:ticketId', async (req, res) => {
  try {
    const deletedTicket = await FarmersTicket.findOneAndDelete({ ticketId: req.params.ticketId });
    if (!deletedTicket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    res.status(200).json({ message: 'Ticket successfully deleted', ticket: deletedTicket });
  } catch (error) {
    console.error('Error deleting ticket:', error);
    res.status(500).json({ message: 'An error occurred while deleting the ticket.' });
  }
});

// Get tickets by category, subcategory, status, or priority (using query parameters)
router.get('/', async (req, res) => {
  const { category, subcategory, status, priority } = req.query;

  let query = {};

  if (category) query.category = category;
  if (subcategory) query.subcategory = subcategory;
  if (status) query.status = status;
  if (priority) query.priority = priority;

  try {
    const tickets = await FarmersTicket.find(query);

    if (tickets.length === 0) {
      return res.status(404).json({ message: 'No tickets found matching the criteria' });
    }

    res.status(200).json({ tickets });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ message: 'An error occurred while fetching tickets.' });
  }
});

module.exports = router;
