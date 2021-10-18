import { getStateRoot } from "../../logic/state"
import { HandlerContextWithPath } from "../../types"

// handlers arguments only type what they need, to make unit testing easier
export async function getMerkleRoot(
  context: HandlerContextWithPath<"catalystDbProvider", "/catalyst/audit/merkle/:catalystDomain">
) {
  const {
    components,
    params: { catalystDomain },
  } = context

  const server = `https://${catalystDomain}/content`
  const root = await getStateRoot(server, "deployments", components)
  console.debug("Reading DB " + server + " deployments, using root state " + root?.toString("hex"))

  return {
    body: {
      root: { rootState: root?.toString("hex") },
    },
  }
}
