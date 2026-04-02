import type User from "./models/User.js"
import type { Team, EnrichedTeam, Subscription } from "./models/Team.js"
import type { Event, EnrichedEvent, Volunteering } from "./models/Event.js"
import type { Job } from "./models/Job.js"

export interface PersistenceTransactions extends
    UserTransactions,
    AuthTransactions,
    TeamTransactions,
    SubscriptionTransactions,
    EventTransactions,
    VolunteeringTransactions,
    JobTransactions {
}

interface UserTransactions {
    createUser(user: User, password: string): Promise<string>
    // TODO deleteUser aka delete own account
    getUserById(userId: string): Promise<User | undefined>
    getUserByEmail(email: string): Promise<User | undefined>
}

interface AuthTransactions {
    updateRefreshToken(userId: string, hashedToken: string): Promise<void>
    deleteRefreshToken(userId: string): Promise<void>
    getRefreshToken(userId: string): Promise<string | undefined>

    updatePasswordByUserId(userId: string, hashedPassword: string): Promise<void>
    updatePasswordByUserEmail(email: string, hashedPassword: string): Promise<void>
    getPassword(userId: string): Promise<string | undefined>
}

interface TeamTransactions {
    createTeam(team: Team): Promise<string>
    deleteTeam(teamId: string): Promise<void>
    getTeam(teamId: string): Promise<Team | undefined>
    getTeamsBySubscriberId(subscriberId: string): Promise<EnrichedTeam[]>
    isUserTeamAdmin(teamId: string, userId: string): Promise<boolean>
}

interface SubscriptionTransactions {
    createSubscription(teamId: string, userId: string): Promise<string>
    deleteSubscription(teamId: string, userId: string): Promise<void>
    getSubscriptionsByTeamId(teamId: string): Promise<Subscription[]>
}

interface EventTransactions {
    createEvent(event: Event): Promise<string>
    deleteEvent(eventId: string): Promise<void>
    getEvent(eventId: string): Promise<Event | undefined>
    getEventsByTeamId(teamId: string): Promise<Event[]>
    getEnrichedEvent(eventId: string, userId: string): Promise<EnrichedEvent | undefined>
    getEnrichedEventsByVolunteerId(userId: string): Promise<EnrichedEvent[]>
}

interface VolunteeringTransactions {
    createVolunteering(eventId: string, userId: string): Promise<string>
    deleteVolunteering(eventId: string, userId: string): Promise<void>
    getVolunteeringsByEventId(eventId: string): Promise<Volunteering[]>
    isUserVolunteering(eventId: string, userId: string): Promise<boolean>
    isAssigned(eventId: string, userId: string): Promise<boolean>
}

interface JobTransactions {
    createJob(eventId: string, jobType: string): Promise<string>
    updateJob(jobId: string, userId: string | null): Promise<void>
    deleteJob(jobId: string): Promise<void>
    getJobsByEventId(eventId: string): Promise<Job[]>
}