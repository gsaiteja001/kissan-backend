const ShowCase = require('../modal/ShowCase');
const Warehouse = require('../modal/warehouse');



// Get all showcases
exports.getAllShowCases = async (req, res) => {
  try {
    const showcases = await ShowCase.find();
    res.status(200).json(showcases);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching showcases', error });
  }
};

// Get a showcase by showcaseId
exports.getShowCaseById = async (req, res) => {
  try {
    const { showcaseId } = req.params;
    const showcase = await ShowCase.findOne({ showcaseId });

    if (!showcase) {
      return res.status(404).json({ message: 'Showcase not found' });
    }

    res.status(200).json(showcase);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching showcase', error });
  }
};

exports.createShowCase = async (req, res) => {
  try {
    const showcaseData = {
      showcaseId: req.body.showcaseId,
      showcaseCategory: {
        showcaseCategoryId: req.body.showcaseCategory.showcaseCategoryId,
        name: req.body.showcaseCategory.name,
      },
      headerImage: req.body.headerImage || '',
      backgroundImage: req.body.backgroundImage || '',
      productBackgroundImage: req.body.productBackgroundImage || '',
      productBaseImage: req.body.productBaseImage || '',
      productTopanimations: req.body.productTopanimations || [],
      headerAnimations: req.body.headerAnimations || [],
      productsSlots: req.body.productsSlots || [],
      productClicks: req.body.productClicks || 0,
      cost: req.body.cost || 0,
    };

    const newShowCase = new ShowCase(showcaseData);
    await newShowCase.save();

    res.status(201).json(newShowCase);
  } catch (error) {
    console.error('Error while creating showcase:', error);  // Log the error to get more details
    res.status(500).json({ message: 'Error creating showcase', error });
  }
};


// Update a showcase by showcaseId
exports.updateShowCase = async (req, res) => {
  try {
    const { showcaseId } = req.params;
    const updatedShowCase = await ShowCase.findOneAndUpdate({ showcaseId }, req.body, { new: true });

    if (!updatedShowCase) {
      return res.status(404).json({ message: 'Showcase not found' });
    }

    res.status(200).json(updatedShowCase);
  } catch (error) {
    res.status(500).json({ message: 'Error updating showcase', error });
  }
};

// Delete a showcase by showcaseId
exports.deleteShowCase = async (req, res) => {
  try {
    const { showcaseId } = req.params;
    const deletedShowCase = await ShowCase.findOneAndDelete({ showcaseId });

    if (!deletedShowCase) {
      return res.status(404).json({ message: 'Showcase not found' });
    }

    res.status(200).json({ message: 'Showcase deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting showcase', error });
  }
};


// Get all showcases for a specific warehouse
exports.getShowCasesByWarehouse = async (req, res) => {
  try {
    const { warehouseId } = req.params; // Get the warehouseId from the request parameters
    console.log('Searching for warehouseId:', warehouseId);
    // Step 1: Fetch the warehouse document by warehouseId
    const warehouse = await Warehouse.findOne({ warehouseId });

    if (!warehouse) {
      return res.status(404).json({ message: 'Warehouse not found' });
    }

    // Step 2: Extract the showcaseIds from the warehouse document
    const showcaseIds = warehouse.showcaseId; // This is an array of showcaseIds

    if (!showcaseIds || showcaseIds.length === 0) {
      return res.status(404).json({ message: 'No showcases associated with this warehouse' });
    }

    // Step 3: Fetch the ShowCase details using showcaseIds
    const showcases = await ShowCase.find({ showcaseId: { $in: showcaseIds } });

    if (showcases.length === 0) {
      return res.status(404).json({ message: 'No ShowCases found for the given showcaseIds' });
    }

    // Return the list of showcases
    res.status(200).json(showcases);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching showcases', error });
  }
};

