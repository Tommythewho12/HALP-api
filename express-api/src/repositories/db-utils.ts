type SingleResult<T extends (string | number)> = {
    res: T
}

export function isSqliteError(error: unknown): error is { code?: string; message: string } {
    return typeof error === 'object' && error !== null && 'code' in error;
}

export function isSingleResult<T extends (string | number)>(row: unknown): row is SingleResult<T> {
    return typeof row === 'object' && row !== null && 'res' in row;
}

export function getSingleResult<T extends (string | number)>(row: unknown): T | undefined {
    if (isSingleResult(row)) {
        return row.res as T;
    }
    return undefined;
}