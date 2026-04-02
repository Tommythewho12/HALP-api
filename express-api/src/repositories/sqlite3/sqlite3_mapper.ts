import type { EnrichedEvent, Event, Volunteering } from "../../domain/models/Event.js";
import type { Job } from "../../domain/models/Job.js";
import type { EnrichedTeam, Subscription, Team } from "../../domain/models/Team.js";
import type User from "../../domain/models/User.js";
import { JOB_ENUM } from "../../resources/constants.js";
import type { EnrichedEventEntity, EnrichedTeamEntity, EventEntity, JobEntity, SubscriptionAndUserEntity, TeamEntity, UserEntity, VolunteeringAndUserEntity } from "./sqlite3_entities.js";

function isTeamEntity(input: any): input is TeamEntity {
    return typeof input === 'object' && 'id' in input && typeof input.id === 'number' && 'name' in input && typeof input.name === 'string' && 'admin_id' in input && typeof input.admin_id === 'number';
}

export function toTeam(input: any): Team {
    if (!isTeamEntity(input))
        throw new Error('cannot parse given input to type Team');
    return {
        id: String(input.id),
        name: input.name,
        adminId: String(input.admin_id)
    }
}

export function toTeamOrUndefined(input: any): Team | undefined {
    try {
        return toTeam(input);
    } catch {
        return undefined;
    }
}

// TODO can I maybe even compare with {0 | 1}?
function isSqlite3Boolean(input: any): boolean {
    return input === 0 || input === 1;
}

function isEnrichedTeamEntity(input: any): input is EnrichedTeamEntity {
    return isTeamEntity(input) && 'is_subscribed' in input && isSqlite3Boolean(input.is_subscribed) && 'is_admin' in input && isSqlite3Boolean(input.is_admin);
}

export function toEnrichedTeam(input: any): EnrichedTeam {
    if (!isEnrichedTeamEntity(input))
        throw new Error('cannot parse given input to type EnrichedTeam');
    return {
        id: String(input.id),
        name: input.name,
        adminId: String(input.admin_id),
        isSubscribed: input.is_subscribed === 1,
        isAdmin: input.is_admin === 1
    }
}

export function toEnrichedTeamOrUndefined(input: any): EnrichedTeam | undefined {
    try {
        return toEnrichedTeam(input);
    } catch {
        return undefined;
    }
}

function isUserEntity(input: any): input is UserEntity {
    return typeof input === 'object' && 'id' in input && typeof input.id === 'number' && 'display_name' in input && typeof input.display_name === 'string' && 'email' in input && typeof input.email === 'string';
}

export function toUser(input: any): User {
    if (!isUserEntity(input))
        throw new Error('cannot parse given input to type User');
    return {
        id: String(input.id),
        displayName: input.display_name,
        email: input.email
    }
}

function isSubscriptionAndUserEntity(input: any): input is SubscriptionAndUserEntity {
    return isUserEntity(input) && 'team_id' in input && typeof input.team_id === 'number';
}

export function toSubscription(input: any): Subscription {
    if (!isSubscriptionAndUserEntity(input))
        throw new Error('cannot parse given input to type Subscription');
    return {
        teamId: String(input.team_id),
        user: toUser(input)
    }
}

function isEventEntity(input: any): input is EventEntity {
    return typeof input === 'object' && 'id' in input && typeof input.id === 'number' && 'name' in input && typeof input.name === 'string' && 'description' in input && typeof input.description === 'string' && 'start_datetime' in input && typeof input.start_datetime === 'number' && 'team_id' in input && typeof input.team_id === 'number' && 'complete' in input && isSqlite3Boolean(input.complete);
}

export function toEvent(input: any): Event {
    if (!isEventEntity(input))
        throw new Error('cannot parse given input to type Event');
    return {
        id: String(input.id),
        name: input.name,
        description: input.description,
        startDatetime: input.start_datetime,
        teamId: String(input.team_id),
        complete: input.complete === 1
    }
}

export function toEventOrUndefined(input: any): Event | undefined {
    try {
        return toEvent(input);
    } catch {
        return undefined;
    }
}

function isEnrichedEventEntity(input: any): input is EnrichedEventEntity {
    return isEventEntity(input) && 'is_volunteering' in input && isSqlite3Boolean(input.is_volunteering) && 'is_assigned' in input && isSqlite3Boolean(input.is_assigned);
}

export function toEnrichedEvent(input: any): EnrichedEvent {
    if (!isEnrichedEventEntity(input))
        throw new Error('cannot parse given input to type EnrichedEvent');
    const event = toEvent(input);
    return {
        ...event,
        isVolunteering: input.is_volunteering === 1,
        isAssigned: input.is_assigned === 1
    }
}

export function toEnrichedEventOrUndefined(input: any): EnrichedEvent | undefined {
    try {
        return toEnrichedEvent(input);
    } catch {
        return undefined;
    }
}

function isVolunteeringAndUserEntity(input: any): input is VolunteeringAndUserEntity {
    return isUserEntity(input) && 'event_id' in input && typeof input.event_id === 'number';
}

export function toVolunteering(input: any): Volunteering {
    if (!isVolunteeringAndUserEntity(input))
        throw new Error('cannot parse given input to type Volunteering');
    return {
        eventId: String(input.event_id),
        user: toUser(input)
    }
}

function isJobEnum(input: any): input is JOB_ENUM {
    return input in JOB_ENUM;
}

function isJobEntity(input: any): input is JobEntity {
    return typeof input === 'object' && 'id' in input && typeof input.id === 'number' && 'event_id' in input && typeof input.event_id === 'number' && 'type' in input && isJobEnum(input.type) && 'user_id' in input && typeof input.user_id === 'number';
}

export function toJob(input: any): Job {
    if (!isJobEntity(input))
        throw new Error('cannot parse given input to type Job');
    return {
        id: String(input.id),
        eventId: String(input.event_id),
        type: input.type,
        assigneeId: String(input.user_id)
    }
}