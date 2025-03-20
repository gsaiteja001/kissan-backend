const express = require('express');
const User = require('../modal/User');  

const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken'); 

const router = express.Router();




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
      userId: new mongoose.Types.ObjectId(), // Automatically generate userId
      credentials: {
        username,
        password,  // You should hash the password before saving it in the database
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

    // Generate a JWT token (with a secret key)
    const token = jwt.sign({ userId: user._id, username: user.credentials.username }, 'your_secret_key', { expiresIn: '1h' });

    res.status(200).json({ message: 'Login successful', token });
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
  
      // Fetch the user by userId
      const user = await User.findById(userId);
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
