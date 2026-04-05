import type { User } from "./User.js"

export interface TeamCreator {
    name: string
    adminId: string
}

export interface Team extends TeamCreator {
    id: string
}

export interface TeamEnriched extends Team {
    isSubscribed: boolean
    isAdmin: boolean
}

export interface Subscription {
    teamId: string
    user: User
}