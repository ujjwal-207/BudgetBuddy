import { ensureSchema } from './schema';

const createTables = async () => {
  try {
    await ensureSchema(true);
    console.log('✅ Database tables created and seeded successfully!');
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  }

  process.exit(0);
};

createTables();
