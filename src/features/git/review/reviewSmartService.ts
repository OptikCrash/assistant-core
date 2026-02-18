import { createProvider } from "../../../llm/providerFactory";
import { ReviewEngine } from "./ReviewEngine";

export async function reviewSmartDiff() {
    const engine = new ReviewEngine(createProvider());
    return engine.run();
}
