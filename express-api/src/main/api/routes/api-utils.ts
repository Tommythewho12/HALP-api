export function successJson(message: string) {
    return {
        message: message
    }
}

export function errorJson(message: string) {
    return {
        errorMessage: message
    }
}

export type RequestUserEnriched = { userId: string };