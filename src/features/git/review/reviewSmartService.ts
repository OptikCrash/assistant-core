import { createProvider } from "../../../llm/providerFactory";
import { getWorkspace } from "../../../workspace/workspaceRegistry";
import { ReviewEngine } from "./ReviewEngine";

export async function reviewSmartDiff(workspaceId: string) {

    const workspace = await getWorkspace(workspaceId);

    const engine = new ReviewEngine(
        createProvider(),
        workspace.rootPath
    );

    return engine.run();
}