import { User } from './entities/User'

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>
  create(user: User): Promise<User>
  markVerified(userId: string): Promise<void>
}