import { Lifecycle } from "@well-known-components/interfaces"
import { setupRouter } from "./controllers/routes"
import { AppComponents, GlobalContext, TestComponents } from "./types"
import { ContentClient, DeploymentFields } from "dcl-catalyst-client"
import { SortingField, SortingOrder } from "dcl-catalyst-commons"

// this function wires the business logic (adapters & controllers) with the components (ports)
export async function main(program: Lifecycle.EntryPointParameters<AppComponents | TestComponents>) {
  const { components, startComponents } = program
  const globalContext: GlobalContext = {
    components,
  }

  // wire the HTTP router (make it automatic? TBD)
  const router = await setupRouter(globalContext)
  components.server.use(router.middleware())
  components.server.setContext(globalContext)

  // start ports: db, listeners, synchronizations, etc
  await startComponents()

  console.time("starting sinchronization")
  const servers = [
    "https://peer.decentraland.org/content",
    "https://peer-ec1.decentraland.org/content",
    "https://peer-wc1.decentraland.org/content",
    "https://peer-ap1.decentraland.org/content",
    "https://peer-eu1.decentraland.org/content",
    "https://interconnected.online/content",
    "https://peer.decentral.games/content",
    "https://peer.melonwave.com/content",
    "https://peer.kyllian.me/content",
    "https://peer.uadevops.com/content",
    "https://peer.dclnodes.io/content",
  ]
  await Promise.all(
    servers.map((contentUrl) =>
      synchronizeAllEntities(
        {
          contentUrl,
          from: new Date("2021-07-01T00:00:00Z").getTime(),
          to: new Date("2021-09-31T00:00:00Z").getTime(),
        },
        components
      )
    )
  )

  console.timeEnd()
}

async function synchronizeAllEntities(
  options: { contentUrl: string; from: number; to: number },
  components: Pick<AppComponents, "deploymentsProvider">
) {
  const client = new ContentClient({ contentUrl: options.contentUrl })

  const deploymentStream = client.iterateThroughDeployments(
    {
      sortBy: { field: SortingField.ENTITY_TIMESTAMP, order: SortingOrder.ASCENDING },
      filters: { from: options.from, to: options.to },
      fields: DeploymentFields.POINTERS_CONTENT_METADATA_AND_AUDIT_INFO,
      limit: 100000,
    },
    {
      timeout: "60s",
    }
  )

  await components.deploymentsProvider.receiveDeployments(deploymentStream, options.contentUrl)
}
