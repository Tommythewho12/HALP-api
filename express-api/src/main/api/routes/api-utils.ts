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

export const MESSAGE_SERVER_ERROR = 'An unknown server error has occurred.'

export const PATHS = {
    index: '/',
    static: '/static',
    auth: '/auth',
    users: '/users',
    teams: '/teams',
    teamId: '/:teamId',
    events: '/events',
    eventId: '/:eventId'
}