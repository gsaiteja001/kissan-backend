const express = require('express');
const mongoose = require('mongoose');
const Agent = require('../modal/Agent'); // Assuming Agent model is in the 'models' folder
const router = express.Router();

// POST route to create a new agent
router.post('/addagent', async (req, res) => {
  try {
    const {
      fullName,
      email,
      role,
      credentials,
      group
    } = req.body;

    // Generate unique groupIds if not provided
    const generatedGroups = group.map((g, index) => ({
      ...g,
      groupId: g.groupId || `groupId-${mongoose.Types.ObjectId()}`
    }));

    // Create new agent with the provided data
    const newAgent = new Agent({
      fullName,
      email,
      role,
      credentials,
      group: generatedGroups
    });

    // Save the new agent to the database
    await newAgent.save();

    // Respond with the newly created agent
    res.status(201).json({
      message: 'Agent created successfully!',
      agent: newAgent
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Error creating agent',
      error: error.message
    });
  }
});

module.exports = router;
