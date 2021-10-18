/**
 * What is this thing?
 *  It is a component that stores and retrieve deployments from the disk.
 *  It behaves like a olap cube, but with files and low infrastructure overhead.
 *
 */

import { IBaseComponent } from "@well-known-components/interfaces"
import { Deployment } from "dcl-catalyst-commons"
import { AppComponents } from "../types"
import { CID } from "multiformats"
import { getStateRoot, putStateRoot } from "../logic/state"

export interface IDeploymentsProviderComponent {
  receiveDeployments(deployments: AsyncIterable<Deployment>, serverUrl: string): Promise<void>
  getDeployments(
    serverUrl: string,
    from: number,
    to: number
  ): AsyncIterator<{
    entityTimestamp: number
    entityType: string
    entityId: string
  }>
}

function normalizeTimestamp(timestamp: number) {
  const date = new Date(timestamp)
  date.setDate(0)
  return date
}

export function* filesForRanges(from: number, to: number): Iterable<Date> {
  const min = normalizeTimestamp(Math.min(from, to))
  const max = normalizeTimestamp(Math.max(from, to + 86399000))
  const maxValue = max.getUTCFullYear() * 100 + max.getUTCMonth()

  let currentValue = min.getUTCFullYear() * 100 + min.getUTCMonth()

  while (true) {
    if (currentValue > maxValue) {
      break
    }

    const currentMonthBaseZero = currentValue % 100

    if (currentMonthBaseZero == 11) {
      currentValue = currentValue + 100 - currentMonthBaseZero
    } else {
      currentValue++
    }

    {
      const currentMonthBaseZero = currentValue % 100
      const currentYear = (currentValue - currentMonthBaseZero) / 100

      const strDate =
        currentYear.toString() + "-" + (currentMonthBaseZero + 1).toString().padStart(2, "0") + "-01T00:00:00Z"
      yield new Date(strDate)
    }
  }
}

export async function createDeploymentsProviderComponent(
  components: Pick<AppComponents, "logs" | "catalystDbProvider">
): Promise<IDeploymentsProviderComponent & IBaseComponent> {
  const logger = components.logs.getLogger("deployments-provider")

  return {
    async start() {},
    async receiveDeployments(deployments, serverUrl) {
      const root = await getStateRoot(serverUrl, "deployments", components)
      logger.debug("Reading DB " + serverUrl + " deployments, using root state " + root?.toString("hex"))
      const db = await components.catalystDbProvider.getCatalystDb(serverUrl, "deployments", root)

      let deployed = 0

      async function commit() {
        logger.debug("commiting state for " + serverUrl + " deployments, adding " + deployed + " deployments")
        await db.commit()
        await putStateRoot(serverUrl, "deployments", db.root, components)
        db.checkpoint()
      }

      db.checkpoint()

      try {
        let i = 0
        for await (const deployment of deployments) {
          i = (i + 1) % 100
          if (!i) {
            await commit()
          }
          const cid = CID.parse(deployment.entityId)
          db.put(Buffer.from(cid.bytes), Buffer.from(JSON.stringify(deployment), "utf-8"))
          deployed++
        }
      } finally {
        await commit()
      }
    },
    async *getDeployments(serverUrl, from, to) {
      // const normalizedServerUrl = normalizeServerUrl(serverUrl)
      // for (const initialDate of filesForRanges(from, to)) {
      //   const file = getServerDeploymentFilePath(initialDate.getTime(), normalizedServerUrl)
      //   for await (const line of processLineByLine(file)) {
      //     if (line && line.length) {
      //       const [entityTimestamp, entityType, entityId] = line.split(/,/g)
      //       if (entityTimestamp && entityType && entityId) {
      //         yield {
      //           entityTimestamp: parseInt(entityTimestamp),
      //           entityType,
      //           entityId,
      //         }
      //       } else {
      //         logger.warn(`Invalid deployment line: ${JSON.stringify(line)} in file ${file}`)
      //       }
      //     }
      //   }
      // }
    },
  }
}
