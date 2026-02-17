import { randomUUID } from 'crypto';
import { TaskPlan } from '../types/messages';

const store = new Map<string, TaskPlan>();

export function savePlan(plan: TaskPlan): string {
    const id = randomUUID();
    store.set(id, plan);
    return id;
}

export function getPlan(id: string): TaskPlan | undefined {
    return store.get(id);
}
