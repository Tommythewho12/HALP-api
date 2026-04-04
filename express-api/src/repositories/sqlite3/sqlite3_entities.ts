export interface UserEntity {
    id: number
    display_name: string
    email: string
}

export interface AuthEntity {
    id: number
    password: string
    refresh_token: string
}

export interface TeamEntity {
    id: number
    name: string
    admin_id: number
}

export interface TeamEnrichedEntity extends TeamEntity {
    is_subscribed: 0 | 1
    is_admin: 0 | 1
}

export interface SubscriptionEntity {
    user_id: number
    team_id: number
}

export interface SubscriptionAndUserEntity extends UserEntity {
    team_id: number
}

export interface EventEntity {
    id: number
    name: string
    description: string
    start_datetime: number
    team_id: number
    complete: 0 | 1
}

export interface EventEnrichedEntity extends EventEntity {
    is_volunteering: 0 | 1
    is_assigned: 0 | 1
}

export interface VolunteeringEntity {
    user_id: number
    event_id: number
}

export interface VolunteeringAndUserEntity extends UserEntity {
    event_id: number
}

export interface JobEntity {
    id: number
    event_id: number
    type: string
    assignee_id: number | null
}

export interface JobAndUsernameEntity extends JobEntity {
    assignee_name: string | null
}