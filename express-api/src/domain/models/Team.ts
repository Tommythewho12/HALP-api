import type User from "./User.js"

export interface Team {
    id: string | null
    name: string
    adminId: string
}

export interface TeamEnriched extends Team {
    isSubscribed: boolean
    isAdmin: boolean
}

export interface Subscription {
    teamId: string
    user: User
}