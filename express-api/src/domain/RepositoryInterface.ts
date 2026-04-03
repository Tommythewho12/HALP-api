import type User from "./models/User.js"
import type { Team, EnrichedTeam, Subscription } from "./models/Team.js"
import type { Event, EnrichedEvent, Volunteering } from "./models/Event.js"
import type { EnrichedJob } from "./models/Job.js"

export interface RepositoryInterface extends
    UserInterface,
    AuthInterface,
    TeamInterface,
    SubscriptionInterface,
    EventInterface,
    VolunteeringInterface,
    JobInterface {
}

interface UserInterface {
    createUser(user: User, password: string): Promise<string>
    // TODO deleteUser aka delete own account
    getUserById(userId: string): Promise<User | undefined>
    getUserByEmail(email: string): Promise<User | undefined>
}

interface AuthInterface {
    updateRefreshToken(userId: string, hashedToken: string): Promise<void>
    deleteRefreshToken(userId: string): Promise<void>
    getRefreshToken(userId: string): Promise<string | undefined>

    updatePasswordByUserId(userId: string, hashedPassword: string): Promise<void>
    updatePasswordByUserEmail(email: string, hashedPassword: string): Promise<void>
    getPassword(userId: string): Promise<string | undefined>
}

interface TeamInterface {
    createTeam(team: Team): Promise<string>
    deleteTeam(teamId: string): Promise<void>
    getTeam(teamId: string): Promise<Team | undefined>
    getTeamsBySubscriberId(subscriberId: string): Promise<EnrichedTeam[]>
    isUserTeamAdmin(teamId: string, userId: string): Promise<boolean>
}

interface SubscriptionInterface {
    createSubscription(teamId: string, userId: string): Promise<string>
    deleteSubscription(teamId: string, userId: string): Promise<void>
    getSubscriptionsByTeamId(teamId: string): Promise<Subscription[]>
}

interface EventInterface {
    createEvent(event: Event): Promise<string>
    deleteEvent(eventId: string): Promise<void>
    getEvent(eventId: string): Promise<Event | undefined>
    getEventsByTeamId(teamId: string): Promise<Event[]>
    getEnrichedEvent(eventId: string, userId: string): Promise<EnrichedEvent | undefined>
    getEnrichedEventsByVolunteerId(userId: string): Promise<EnrichedEvent[]>
}

interface VolunteeringInterface {
    createVolunteering(eventId: string, userId: string): Promise<string>
    deleteVolunteering(eventId: string, userId: string): Promise<void>
    getVolunteeringsByEventId(eventId: string): Promise<Volunteering[]>
    isUserVolunteering(eventId: string, userId: string): Promise<boolean>
    isAssigned(eventId: string, userId: string): Promise<boolean>
}

interface JobInterface {
    createJob(eventId: string, jobType: string): Promise<string>
    updateJob(jobId: string, userId: string | null): Promise<void>
    deleteJob(jobId: string): Promise<void>
    getJobsByEventId(eventId: string): Promise<EnrichedJob[]>
}