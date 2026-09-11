require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const User = require('../models/User');

const ADMIN_EMAIL = 'hafiz@gmail.com';

async function seedAdmin() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI is missing from backend/.env');
    }

    await mongoose.connect(uri);

    const admin = await Admin.findOneAndUpdate(
      { email: ADMIN_EMAIL },
      {
        email: ADMIN_EMAIL,
        name: 'Hafiz Admin',
        role: 'admin',
        isActive: true
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );

    const user = await User.findOneAndUpdate(
      { email: ADMIN_EMAIL },
      {
        email: ADMIN_EMAIL,
        hasAccess: true
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );

    console.log('Admin seeded successfully:', admin.email);
    console.log('Reader access seeded successfully:', user.email, user.hasAccess);
    process.exit(0);
  } catch (error) {
    console.error('Admin seed failed:', error.message);
    process.exit(1);
  }
}

seedAdmin();
