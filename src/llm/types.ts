import { TaskPlan } from '../types/messages';

export interface LLMProvider {
    generatePlan(message: string): Promise<TaskPlan>;
    generateRawJson<T>(message: string): Promise<T>;
}
