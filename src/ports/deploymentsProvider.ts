/**
 * What is this thing?
 *  It is a component that stores and retrieve deployments from the disk.
 *  It behaves like a olap cube, but with files and low infrastructure overhead.
 *
 */

import { IBaseComponent } from "@well-known-components/interfaces"
import { Deployment } from "dcl-catalyst-commons"
import { createReadStream, createWriteStream, existsSync, WriteStream } from "fs"
import { createInterface } from "readline"
import { mkdir } from "fs/promises"
import { AppComponents } from "../types"

export interface IDeploymentsProviderComponent {
  receiveDeployments(deployments: AsyncIterable<Deployment>, serverDomain: string): Promise<void>
  getDeployments(
    serverDomain: string,
    from: number,
    to: number
  ): AsyncIterator<{
    entityTimestamp: number
    entityType: string
    entityId: string
  }>
}

export function normalizeServerDomain(domain: string): string {
  const ret = domain
    .replace(/^(.+:\/\/)/, "")
    .replace(/([^A-Z0-9.-])/gi, "-")
    .replace(/\--+|\-$/g, "")
    .trim()
  if (!ret) throw new Error("Invalid server name: " + domain)
  return ret
}

const basepathDeployments = `content/deployments`

// // returns the path where the deployment should be stored on disk
// function getDeploymentMetadataPath(deployment: Deployment) {
//   if (deployment.entityId.startsWith("bafy")) {
//     return `${basepathDeployments}/${deployment.entityId.substr(0, 8)}`
//   }
//   return `${basepathDeployments}/${deployment.entityId.substr(0, 6)}`
// }

function normalizeTimestamp(timestamp: number) {
  const date = new Date(timestamp)
  date.setDate(0)
  return date
}

// returns the file for the specific server in which we should append the deployment
// one file per server per month
function getServerDeploymentFilePath(timestamp: number, normalizedServerDomain: string) {
  const prefix = normalizedServerDomain
  const date = new Date(timestamp)
  const postfix = date.getFullYear().toString() + (date.getMonth() + 1).toString().padStart(2, "0")
  return `${basepathDeployments}/${prefix}-${postfix}`
}

function encodeDeploymentAsBuffer(deployment: Deployment): Buffer {
  return Buffer.from([deployment.entityTimestamp, deployment.entityType, deployment.entityId].join(",") + "\n", "utf-8")
}

async function* processLineByLine(file: string) {
  if (!existsSync(file)) return
  const fileStream = createReadStream(file)

  yield* createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  })
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
  components: Pick<AppComponents, "logs">
): Promise<IDeploymentsProviderComponent & IBaseComponent> {
  const logger = components.logs.getLogger("deployments-provider")

  return {
    async start() {
      try {
        await mkdir(basepathDeployments)
      } catch {}
    },
    async receiveDeployments(deployments, serverDomain) {
      const openFiles = new Map<string, WriteStream>()
      const normalizedServerDomain = normalizeServerDomain(serverDomain)
      const stats = new Map<string, number>()
      function printStatus() {
        stats.forEach((v, k) => {
          logger.debug("received " + v + " for " + k)
        })
        stats.clear()
      }
      function incStats(key: string) {
        stats.set(key, (stats.get(key) || 0) + 1)
      }
      const statusInterval = setInterval(printStatus, 1000)
      try {
        for await (const deployment of deployments) {
          const filename = getServerDeploymentFilePath(deployment.entityTimestamp, normalizedServerDomain)
          let writeStream = openFiles.get(filename)
          if (!writeStream) {
            logger.debug("opening file " + filename)
            writeStream = createWriteStream(filename, { flags: "a" })
            openFiles.set(filename, writeStream)
          }
          const lineitem = encodeDeploymentAsBuffer(deployment)
          writeStream.write(lineitem)
          incStats(filename)
        }
      } finally {
        clearInterval(statusInterval)
        printStatus()
        openFiles.forEach(($) => $.close())
        openFiles.clear()
      }
    },
    async *getDeployments(serverDomain, from, to) {
      const normalizedServerDomain = normalizeServerDomain(serverDomain)

      for (const initialDate of filesForRanges(from, to)) {
        const file = getServerDeploymentFilePath(initialDate.getTime(), normalizedServerDomain)
        for await (const line of processLineByLine(file)) {
          if (line && line.length) {
            const [entityTimestamp, entityType, entityId] = line.split(/,/g)
            if (entityTimestamp && entityType && entityId) {
              yield {
                entityTimestamp: parseInt(entityTimestamp),
                entityType,
                entityId,
              }
            } else {
              logger.warn(`Invalid deployment line: ${JSON.stringify(line)} in file ${file}`)
            }
          }
        }
      }
    },
  }
}
