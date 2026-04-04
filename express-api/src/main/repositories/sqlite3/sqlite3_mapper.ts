import type { EventEnriched, VolunteeringEnriched, Event } from "../../domain/models/Event.js";
import type { JobEnriched, Job } from "../../domain/models/Job.js";
import type { TeamEnriched, Subscription, Team } from "../../domain/models/Team.js";
import type User from "../../domain/models/User.js";
import { JobTypes } from "../../resources/constants.js";
import type { EventEnrichedEntity, TeamEnrichedEntity, EventEntity, JobAndUsernameEntity, JobEntity, SubscriptionAndUserEntity, TeamEntity, UserEntity, VolunteeringAndUserEntity } from "./sqlite3_entities.js";

function isTeamEntity(input: any): input is TeamEntity {
    return typeof input === 'object' && 'id' in input && typeof input.id === 'number' && 'name' in input && typeof input.name === 'string' && 'admin_id' in input && typeof input.admin_id === 'number';
}

export function toTeam(input: any): Team {
    if (!isTeamEntity(input))
        throw new Error('cannot parse given input to type Team', input);
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

function isEnrichedTeamEntity(input: any): input is TeamEnrichedEntity {
    return isTeamEntity(input) && 'is_subscribed' in input && isSqlite3Boolean(input.is_subscribed) && 'is_admin' in input && isSqlite3Boolean(input.is_admin);
}

export function toEnrichedTeam(input: any): TeamEnriched {
    if (!isEnrichedTeamEntity(input))
        throw new Error('cannot parse given input to type EnrichedTeam', input);
    return {
        id: String(input.id),
        name: input.name,
        adminId: String(input.admin_id),
        isSubscribed: input.is_subscribed === 1,
        isAdmin: input.is_admin === 1
    }
}

export function toEnrichedTeamOrUndefined(input: any): TeamEnriched | undefined {
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
        throw new Error('cannot parse given input to type User', input);
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
        throw new Error('cannot parse given input to type Subscription', input);
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
        throw new Error('cannot parse given input to type Event', input);
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

function isEnrichedEventEntity(input: any): input is EventEnrichedEntity {
    return isEventEntity(input) && 'is_volunteering' in input && isSqlite3Boolean(input.is_volunteering) && 'is_assigned' in input && isSqlite3Boolean(input.is_assigned);
}

export function toEnrichedEvent(input: any): EventEnriched {
    if (!isEnrichedEventEntity(input))
        throw new Error('cannot parse given input to type EnrichedEvent', input);
    const event = toEvent(input);
    return {
        ...event,
        isVolunteering: input.is_volunteering === 1,
        isAssigned: input.is_assigned === 1
    }
}

export function toEnrichedEventOrUndefined(input: any): EventEnriched | undefined {
    try {
        return toEnrichedEvent(input);
    } catch {
        return undefined;
    }
}

function isVolunteeringAndUserEntity(input: any): input is VolunteeringAndUserEntity {
    return isUserEntity(input) && 'event_id' in input && typeof input.event_id === 'number';
}

export function toEnrichedVolunteering(input: any): VolunteeringEnriched {
    if (!isVolunteeringAndUserEntity(input))
        throw new Error('cannot parse given input to type Volunteering', input);
    return {
        eventId: String(input.event_id),
        volunteer: toUser(input)
    }
}

function isJobTypeString(input: any): input is keyof typeof JobTypes {
    return Object.keys(JobTypes).includes(input.toUpperCase());
    // return input.toUpperCase() in JobTypes;
}

function toJobType(input: any): JobTypes {
    if (!isJobTypeString(input))
        throw new Error('cannot parse given input to type JobTypes', input);
    return JobTypes[input];
}

function isJobEntity(input: any): input is JobEntity {
    return typeof input === 'object' && 'id' in input && typeof input.id === 'number' && 'event_id' in input && typeof input.event_id === 'number' && /*'type' in input && isJobTypeString(input.type) &&*/ 'assignee_id' in input && (input.assignee_id === null || typeof input.assignee_id === 'number');
}

export function toJob(input: any): Job {
    if (!isJobEntity(input))
        throw new Error('cannot parse given input to type Job', input);
    return {
        id: String(input.id),
        eventId: String(input.event_id),
        type: toJobType(input.type),
        assigneeId: String(input.assignee_id)
    }
}

function isJobAndUsernameEntity(input: any): input is JobAndUsernameEntity {
    return isJobEntity(input) && 'assignee_name' in input && (input.assignee_name === null || typeof input.assignee_name === 'number');
}

export function toEnrichedJob(input: any): JobEnriched {
    if (!isJobAndUsernameEntity(input))
        throw new Error('cannot parse given input to type EnrichedJob', input);
    const job = toJob(input);
    return {
        ...job,
        assigneeName: String(input.assignee_name)
    }
}