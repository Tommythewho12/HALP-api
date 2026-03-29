type SingleResult<T extends (string | number)> = {
    res: T
}

// TODO unused: remove
export function isSqliteError(error: unknown): error is { code?: string; message: string } {
    return typeof error === 'object' && error !== null && 'code' in error;
}

// TODO customize, so that it does not have to be called 'res'
export function isSingleResult<T extends (string | number)>(row: unknown): row is SingleResult<T> {
    return typeof row === 'object' && row !== null && 'res' in row;
}

export function isListResult<T extends (string | number)>(rows: unknown[]): rows is SingleResult<T>[] {
    if (rows !== null && rows instanceof Array) {
        if (rows.length === 0) return true;
        return isSingleResult(rows.at(0));
    }
    return false;
}

export function getSingleResult<T extends (string | number)>(row: unknown): T | undefined {
    if (isSingleResult<T>(row)) {
        return row.res as T;
    }
    return undefined;
}

export function getListResult<T extends (string | number)>(rows: unknown[]): T[] {
    if (isListResult(rows)) {
        return rows.map(r => r.res) as T[];
    }
    return [];
}