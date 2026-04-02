import type { PersistenceTransactions } from "../domain/PersistenceTransactions.js";
import BetterSqlite3Repository from "./BetterSqlite3Repository.js";

function createRepository(): PersistenceTransactions {
    switch (process.env.DB_DRIVER) {
        case 'BETTER-SQLITE3':
            console.debug('#### found env for SQLITE3');
            return new BetterSqlite3Repository();
        default:
            throw new Error('Unsupported DB_DRIVER');
    }
}

const Repository: PersistenceTransactions = createRepository();

export default Repository;