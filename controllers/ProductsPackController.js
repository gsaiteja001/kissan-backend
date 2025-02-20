const Pack = require('../modal/Pack');

// Get all packs
exports.getAllPacks = async (req, res) => {
  try {
    const packs = await Pack.find();
    res.status(200).json(packs);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching packs', error });
  }
};

// Get a pack by packId
exports.getPackById = async (req, res) => {
  try {
    const { packId } = req.params;
    const pack = await Pack.findOne({ packId });

    if (!pack) {
      return res.status(404).json({ message: 'Pack not found' });
    }

    res.status(200).json(pack);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching pack', error });
  }
};

// Create a new pack
exports.createPack = async (req, res) => {
  try {
    const newPack = new Pack(req.body);
    await newPack.save();
    res.status(201).json(newPack);
  } catch (error) {
    res.status(500).json({ message: 'Error creating pack', error });
  }
};

// Update a pack by packId
exports.updatePack = async (req, res) => {
  try {
    const { packId } = req.params;
    const updatedPack = await Pack.findOneAndUpdate({ packId }, req.body, { new: true });

    if (!updatedPack) {
      return res.status(404).json({ message: 'Pack not found' });
    }

    res.status(200).json(updatedPack);
  } catch (error) {
    res.status(500).json({ message: 'Error updating pack', error });
  }
};

// Delete a pack by packId
exports.deletePack = async (req, res) => {
  try {
    const { packId } = req.params;
    const deletedPack = await Pack.findOneAndDelete({ packId });

    if (!deletedPack) {
      return res.status(404).json({ message: 'Pack not found' });
    }

    res.status(200).json({ message: 'Pack deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting pack', error });
  }
};
