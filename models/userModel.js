userModel.js
const mongoose = require('mongoose')
const validator = require('validator')
const bcrypt = require('bcryptjs')

const userSchema = new mongoose.Schema({
	firstName: {
		type: String,
		required:[true, 'Please enter your first name.']
},
        lastName: {
		type: String,
		required:[true, 'Please enter your last name.']
},	email: {
		type: String,
		unique: true,
		validate: [validator.isEmail, 'Please enter a valid email.'],
		required:[true, 'Please enter your email.']
},
        password: {
		type: String,
		required:[true, 'Please enter a password.']
},
 	confirmPassword: {
		type: String,
		required:[true, 'Please confirm your password.'],
		validate:{
			validator: function(cpvalue){
			return cpvalue == this.password;
		},
		message: 'Password & Confirm Password does not match!'			
	}
},

})
userSchema.pre('save', function(next){
    if(!this.isModified('password')) return next();
    bcrypt.hash(this.password, 12, (err, hash)=>{
        if(err) return next(err);
        this.password = hash;
        this.confirmPassword = undefined;
        next();
    });

})
const User = mongoose.model('User', userSchema)

module.exports = User