import { Router } from "@well-known-components/http-server"
import { GlobalContext } from "../types"
import { getMerkleRoot } from "./handlers/get-merkle-root"
import { pingHandler } from "./handlers/ping-handler"
import { rehash } from "./handlers/rehash"
import { synchronizationHandler } from "./handlers/synchronize-server"

// We return the entire router because it will be easier to test than a whole server
export async function setupRouter(globalContext: GlobalContext): Promise<Router<GlobalContext>> {
  const router = new Router<GlobalContext>()

  router.get("/ping", pingHandler)
  router.get("/synchronize", synchronizationHandler)
  router.get("/catalyst/audit/merkle/:catalystDomain", getMerkleRoot)
  router.get("/catalyst/audit/merkle/:catalystDomain/rehash", rehash)

  return router
}
