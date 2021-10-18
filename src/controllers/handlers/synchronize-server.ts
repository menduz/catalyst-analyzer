import { SortingField, SortingOrder } from "dcl-catalyst-commons"
import { ContentClient, DeploymentFields } from "../../../../catalyst-client/dist"
import { AppComponents, HandlerContextWithPath } from "../../types"

// handlers arguments only type what they need, to make unit testing easier
export async function synchronizationHandler(context: HandlerContextWithPath<"deploymentsProvider", "/synchronize">) {
  const { url, components } = context

  
  const servers = [
    "https://peer.decentraland.org/content",
    // "https://peer-ec1.decentraland.org/content",
    // "https://peer-wc1.decentraland.org/content",
    // "https://peer-ap1.decentraland.org/content",
    // "https://peer-eu1.decentraland.org/content",
    // "https://interconnected.online/content",
    // "https://peer.decentral.games/content",
    // "https://peer.melonwave.com/content",
    // "https://peer.kyllian.me/content",
    // "https://peer.uadevops.com/content",
    // "https://peer.dclnodes.io/content",
  ]
  
  console.time("starting sinchronization")
  await Promise.all(
    servers.map((contentUrl) =>
      synchronizeAllEntities(
        {
          contentUrl,
          // from: new Date("2021-07-01T00:00:00Z").getTime(),
          // to: new Date("2021-09-31T00:00:00Z").getTime(),
          // from: 0,
          from: new Date("2020-02-22T00:00:00Z").getTime(),
          to: new Date("2020-02-25T00:00:00Z").getTime(),
        },
        components
      )
    )
  )
  console.timeEnd()

  return {
    body: url.pathname,
  }
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
