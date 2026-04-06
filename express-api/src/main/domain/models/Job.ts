import { JobTypes } from "../../resources/constants.js"


export interface JobCreator {
    eventId: string
    type: JobTypes
}

export interface Job extends JobCreator {
    id: string
    assigneeId: string | null
}

export interface JobEnriched extends Job {
    assigneeName: string | null
    assigneeEmail: string | null
}