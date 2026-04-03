import type { RepositoryInterface } from "../domain/RepositoryInterface.js";
import { BetterSqlite3Repository } from "./sqlite3/bettersqlite3_repository.js";

function createRepository(): RepositoryInterface {
    switch (process.env.DB_DRIVER) {
        case 'BETTER-SQLITE3':
            console.debug('#### found env for SQLITE3');
            return new BetterSqlite3Repository();
        default:
            throw new Error('Unsupported DB_DRIVER');
    }
}

export const repository: RepositoryInterface = createRepository();