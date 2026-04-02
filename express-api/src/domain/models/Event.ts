import type User from "./User.js"

export interface Event {
    id: string | null
    name: string
    description: string
    startDatetime: number // epoch in seconds
    teamId: string
    complete: boolean
}

export interface EnrichedEvent extends Event {
    isVolunteering: boolean
    isAssigned: boolean
}

export interface Volunteering {
    eventId: string
    user: User
}