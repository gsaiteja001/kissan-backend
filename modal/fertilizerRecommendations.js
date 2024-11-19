const mongoose = require('mongoose');

const fertilizerSchema = new mongoose.Schema({
    Crop: {
        type: String,
        required: true
    },
    FYM: {
        type: String,
        required: false
    },
    NPK_Ratio: {
        type: String,
        required: true
    },
    Additional_Information: {
        type: String,
        required: false 
    }
}, {
    collection: 'fertilizer_recommendations'
});

module.exports = mongoose.model('FertilizerRecommendation', fertilizerSchema);
