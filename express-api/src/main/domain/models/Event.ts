import type { User } from "./User.js"

export interface EventCreator {
    name: string
    description: string
    startDatetime: number // epoch in seconds
    teamId: string
    complete: boolean
}

export interface Event extends EventCreator {
    id: string
}

export interface EventEnriched extends Event {
    isVolunteering: boolean
    isAssigned: boolean
}

export interface Volunteering {
    eventId: string
    volunteerId: string
}

export interface VolunteeringEnriched extends User {
    eventId: string
}