"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const schema_1 = require("./schema");
const createTables = async () => {
    try {
        await (0, schema_1.ensureSchema)(true);
        console.log('✅ Database tables created and seeded successfully!');
    }
    catch (error) {
        console.error('❌ Migration error:', error);
        throw error;
    }
    process.exit(0);
};
createTables();
//# sourceMappingURL=migrate.js.map