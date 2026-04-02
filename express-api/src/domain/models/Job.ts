import { JOB_ENUM } from "../../resources/constants.js"

export interface Job {
    id: string | null
    eventId: string
    type: keyof typeof JOB_ENUM
    assigneeId: string
}