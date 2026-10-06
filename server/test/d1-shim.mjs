// In-memory D1 for the Worker tests: the real adapter (src/d1-sqlite.js) with the real schema.sql.
import { openD1 } from '../src/d1-sqlite.js';

export const createD1 = () => openD1(':memory:');
