import { JobTypes } from "../../resources/constants.js"

export interface Job {
    id: string | null
    eventId: string
    type: JobTypes
    assigneeId: string
}

export interface EnrichedJob extends Job {
    assigneeName: string
}