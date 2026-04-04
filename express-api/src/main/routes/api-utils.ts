function singleMessageJson(message: string) {
    return {
        message: message
    }
}

export function successJson(message: string) {
    return singleMessageJson(message);
}

export function errorJson(message: string) {
    return singleMessageJson(message);
}