export interface UserCreator {
    displayName: string
    email: string
}

export interface User extends UserCreator {
    id: string
}