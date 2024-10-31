
const mongoose = require('mongoose');
const { Schema } = mongoose;


const GroupMemberSchema = new Schema({
  farmerId: { type: String, required: false },
  name: { type: String, required: false },
  phoneNumber: { type: String, required: false },
  cropProgress: { type: Number, default: 0 }, 
});


const GroupSchema = new Schema({
  groupId: { type: String, required: false, trim: true },
  groupName: { type: String, required: false, trim: true },
  cropType: { type: String, required: false, trim: true },
  cropId: { type: String, required: false, trim: true },
  groupImage: { type: String }, 
  members: { type: [GroupMemberSchema], required: false },
  activeOrders: { type: Number, default: 0 },
  servicesInProgress: { type: Number, default: 0 },
  averageCropProgress: { type: Number, default: 0 }, 
  createdBy: { type: String, required: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});


// GroupSchema.pre('save', function (next) {
//   this.updatedAt = Date.now();
//   next();
// });


// GroupSchema.pre('save', function (next) {
//   if (this.members && this.members.length > 0) {
//     const totalProgress = this.members.reduce((sum, member) => sum + member.cropProgress, 0);
//     this.averageCropProgress = totalProgress / this.members.length;
//   } else {
//     this.averageCropProgress = 0;
//   }
//   next();
// });


module.exports = mongoose.model('Group', GroupSchema);
