
const mongoose = require('mongoose');
const express = require('express');

const moment = require('moment-timezone'); 
const User = require('../modal/User');  

const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken'); 

const router = express.Router();






// Bulk upload endpoint for agents data
router.post('/agents/bulk', async (req, res) => {
  try {
    const agents = req.body; // expecting an array of agent objects

    // Map each agent to a user document
    // Instead of using agent.userId (a 5-digit string), we generate a new ObjectId.
    const users = agents.map(agent => ({
      userId: new mongoose.Types.ObjectId(),
      credentials: {
        username: agent.fullName.replace(/\s+/g, '').toLowerCase(),
        password: 'defaultpassword' // replace with a secure method in production
      },
      name: agent.fullName,
      email: `${agent.fullName.replace(/\s+/g, '').toLowerCase()}@example.com`,
      userRoles: ['supportAgent'], // assuming these are support agents; adjust as needed
      agent: agent
    }));

    // Bulk insert into the User collection
    const result = await User.insertMany(users);
    res.status(201).json({ message: "Bulk upload successful", data: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Bulk upload failed", error: error.message });
  }
});








/**
 * Create a new user.
 * - If the userRoles include 'supportAdmin' or 'supportAgent', then agent details must be provided.
 */
router.post('/users', async (req, res) => {
  try {
    const {
      credentials,
      name,
      email,
      phoneNumber,
      address,
      userRoles,
      status,
      agent,
    } = req.body;

    // Validate required agent details for support roles
    if (
      userRoles &&
      (userRoles.includes('supportAdmin') || userRoles.includes('supportAgent'))
    ) {
      if (!agent) {
        return res
          .status(400)
          .json({ error: "Agent details are required for support roles." });
      }
    }

    // Create a new user
    const newUser = new User({
      credentials,
      name,
      email,
      phoneNumber,
      address,
      userRoles,
      status,
      agent, // agent details (optional if not a support role)
    });

    await newUser.save();
    res.status(201).json(newUser);
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Server error" });
  }
});



// API endpoint to fetch users with 'supportAgent' role
router.get('/supportAgents', async (req, res) => {
  try {
    const users = await User.find({
      userRoles: 'supportAgent'
    })
    .select('userId agent.agentId name')  // Select only the userId, agentId, and name fields
    .exec();

    if (users.length === 0) {
      return res.status(404).json({ message: 'No support agents found' });
    }

    res.status(200).json(users);
  } catch (err) {
    console.error('Error fetching support agents:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});




/**
 * Get all users.
 * Optional query parameter: ?role=someRole to filter by a specific role.
 */
router.get('/users', async (req, res) => {
  try {
    const { role } = req.query;
    let filter = {};
    if (role) {
      filter.userRoles = role;
    }
    const users = await User.find(filter);
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * Get a single user by ID.
 */
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * Update an existing user by ID.
 * - Again, if the updated userRoles include support roles, agent details must be provided.
 */
router.put('/users/:id', async (req, res) => {
  try {
    const {
      credentials,
      name,
      email,
      phoneNumber,
      address,
      userRoles,
      status,
      agent,
    } = req.body;

    // Validate if the user is being updated as a support role
    if (
      userRoles &&
      (userRoles.includes('supportAdmin') || userRoles.includes('supportAgent'))
    ) {
      if (!agent) {
        return res
          .status(400)
          .json({ error: "Agent details are required for support roles." });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      {
        credentials,
        name,
        email,
        phoneNumber,
        address,
        userRoles,
        status,
        agent,
      },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * Delete a user by ID.
 */
router.delete('/users/:id', async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Server error" });
  }
});





// Allowed permissions for validation
const allowedPermissions = [
  'manage-tickets',
  'view-tickets',
  'assign-tickets',
  'resolve-tickets',
  'transfer-tickets',
  'admin'
];

// POST endpoint to create an Admin agent with group information
router.post('/create-admin', async (req, res) => {
  try {
    const { groupName, permissions, fullName, email, phoneNumber } = req.body;

    // Validate required fields
    if (!groupName || !permissions || !fullName || !email || !phoneNumber) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }

    // Validate that provided permissions are allowed
    for (const perm of permissions) {
      if (!allowedPermissions.includes(perm)) {
        return res.status(400).json({ message: `Invalid permission: ${perm}` });
      }
    }

    // Generate a unique groupId
    const groupId = uuidv4();

    // Create a new agent with the role set to "Admin" and attach the group info
    const newAdmin = new Agent({
      fullName,
      email,
      phoneNumber,
      role: 'Admin', // Force role to Admin
      group: [{
        groupId,
        groupName,
        permissions
      }]
    });

    await newAdmin.save();
    res.status(201).json({ message: 'Admin agent created successfully', agent: newAdmin });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error });
  }
});



// POST /api/agents - Create a new agent
router.post('/newAgent', async (req, res) => {
  try {
    // Destructure the required fields from the request body
    const { fullName, email, phoneNumber, credentials, role } = req.body;
    
    // Basic validation for required fields
    if (!fullName || !email || !phoneNumber || !credentials || !credentials.username || !credentials.password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Optionally, check if an agent with the same email or username already exists.
    // This is recommended to avoid duplicate entries.
    const existingAgent = await Agent.findOne({ email });
    if (existingAgent) {
      return res.status(400).json({ error: 'Agent with this email already exists' });
    }
    
    // Hash the password with bcrypt
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(credentials.password, saltRounds);

    // Create the new Agent document
    const newAgent = new Agent({
      fullName,
      email,
      phoneNumber,
      role, // Ensure role is one of the allowed values: 'Agent', 'Admin', 'TeamLeader'
      credentials: {
        username: credentials.username,
        passwordHash: hashedPassword,
        // authenticationMethod defaults to 'email/password'
      },
      // Initialize group as an empty array; adjust if you want to assign default groups
      group: []
    });

    // Save the agent to the database
    const savedAgent = await newAgent.save();
    
    // Respond with the created agent
    return res.status(201).json({ message: 'Agent created successfully', agent: savedAgent });
    
  } catch (error) {
    console.error('Error creating agent:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});


// Route to create a new user
router.post('/addusers', async (req, res) => {
  try {
    const { userId, credentials, name, email, phoneNumber, address, userRoles } = req.body;

    // Validate the roles
    const validRoles = [
      'superAdmin', 'serviceAdmin', 'ProductAdmin', 'Vendor', 'supportAdmin', 
      'supportAgent', 'financialAdmin', 'groupsAdmin', 'groupLeader'
    ];

    if (!userRoles.every(role => validRoles.includes(role))) {
      return res.status(400).json({ error: 'Invalid user role(s)' });
    }

    const newUser = new User({
      userId,
      credentials,
      name,
      email,
      phoneNumber,
      address,
      userRoles
    });

    // Save the user in the database
    await newUser.save();

    res.status(201).json({ message: 'User created successfully', user: newUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});


router.post('/signup', async (req, res) => {
  try {
    const { name, email, phoneNumber, address, userRoles, username, password } = req.body;

    // Validate the roles
    const validRoles = [
      'superAdmin', 'serviceAdmin', 'ProductAdmin', 'Vendor', 'supportAdmin',
      'supportAgent', 'financialAdmin', 'groupsAdmin', 'groupLeader'
    ];

    if (!userRoles.every(role => validRoles.includes(role))) {
      return res.status(400).json({ error: 'Invalid user role(s)' });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email is already registered' });
    }

    // If everything is fine, create the new user
    const newUser = new User({
      userId: new mongoose.Types.ObjectId(), 
      credentials: {
        username,
        password,  
      },
      name,
      email,
      phoneNumber,
      address,
      userRoles
    });

    // Hash the password before saving (important)
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    newUser.credentials.password = await bcrypt.hash(newUser.credentials.password, salt);

    // Save the user to the database
    await newUser.save();

    res.status(201).json({ message: 'User created successfully', user: newUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});



// Route for user login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user by username
    const user = await User.findOne({ 'credentials.username': username });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Compare password with the stored hashed password
    const isMatch = await bcrypt.compare(password, user.credentials.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Update lastloginTime to current IST time
    const currentISTTime = moment.tz('Asia/Kolkata').format();  // Get current time in IST
    user.lastloginTime = currentISTTime;
    await user.save();  // Save the updated user document

    // Generate a JWT token (with a secret key)
    const token = jwt.sign({ userId: user._id, username: user.credentials.username }, 'your_secret_key', { expiresIn: '1h' });

    res.status(200).json({ message: 'Login successful', token, userId: user.userId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to login' });
  }
});



// Route to edit an existing user
router.put('/edituser/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const { name, email, phoneNumber, address, userRoles } = req.body;
  
      // Validate roles if changing
      const validRoles = [
        'superAdmin', 'serviceAdmin', 'ProductAdmin', 'Vendor', 'supportAdmin', 
        'supportAgent', 'financialAdmin', 'groupsAdmin', 'groupLeader'
      ];
      if (userRoles && !userRoles.every(role => validRoles.includes(role))) {
        return res.status(400).json({ error: 'Invalid user role(s)' });
      }
  
      // Find the user by ID
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      // Update user details
      user.name = name || user.name;
      user.email = email || user.email;
      user.phoneNumber = phoneNumber || user.phoneNumber;
      user.address = address || user.address;
      user.userRoles = userRoles || user.userRoles;
  
      // Save the updated user
      await user.save();
  
      res.status(200).json({ message: 'User updated successfully', user });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update user' });
    }
  });

  

  // Route to delete a user
router.delete('/deleteuser/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
  
      // Find the user by ID and remove
      const user = await User.findByIdAndDelete(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      res.status(200).json({ message: 'User deleted successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  });



  router.get('/allusers', async (req, res) => {
    try {
      // Fetch all users from the database
      const users = await User.find();
      if (users.length === 0) {
        return res.status(404).json({ message: 'No users found' });
      }
  
      res.status(200).json({ users });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });




  // Route to fetch user by userId
  router.get('/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Find the user by the userId field instead of _id
      const user = await User.findOne({ userId: userId });
  
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      res.status(200).json({ user });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  });
  




  // Route to fetch users by userRoles
router.get('/usersbyroles', async (req, res) => {
    try {
      const { role } = req.query;  // The role will be passed as a query parameter
  
      // Validate the role
      const validRoles = [
        'superAdmin', 'serviceAdmin', 'ProductAdmin', 'Vendor', 'supportAdmin', 
        'supportAgent', 'financialAdmin', 'groupsAdmin', 'groupLeader'
      ];
  
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid user role' });
      }
  
      // Find all users with the specified role
      const users = await User.find({ userRoles: role });
  
      if (users.length === 0) {
        return res.status(404).json({ message: `No users found with the role: ${role}` });
      }
  
      res.status(200).json({ users });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch users by role' });
    }
  });
  



module.exports = router;
