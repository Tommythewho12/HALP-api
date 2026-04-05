import { JobTypes } from "../../resources/constants.js"

export interface Job {
    id: string
    eventId: string
    type: JobTypes
    assigneeId: string | null
}

export interface JobEnriched extends Job {
    assigneeName: string | null
    assigneeEmail: string | null
}