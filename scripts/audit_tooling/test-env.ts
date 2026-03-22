import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
console.log("TURSO_DATABASE_URL:", process.env.TURSO_DATABASE_URL ? "Exists" : "Missing");
console.log("TURSO_AUTH_TOKEN:", process.env.TURSO_AUTH_TOKEN ? "Exists" : "Missing");
