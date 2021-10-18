import { CatalystDbType } from "../ports/catalystDbProvider"
import { Components } from "../types"
import { normalizeServerDomain } from "./naming"

export function getDbName(serverUrl: string, dbType: CatalystDbType): string {
  return normalizeServerDomain(serverUrl) + "-" + dbType
}

export async function getStateRoot(
  serverUrl: string,
  dbType: CatalystDbType,
  components: Components<"catalystDbProvider">
): Promise<Buffer | undefined> {
  const stateDb = await components.catalystDbProvider.getDb()
  try {
    const root = await stateDb.get(getDbName(serverUrl, dbType) + "-root")
    console.log("read", serverUrl, dbType, "root", root)

    if (!root) return undefined
    return Buffer.from(root, "hex")
  } catch (err: any) {
    if (err.notFound) return undefined
    throw err
  }
}

export async function putStateRoot(
  serverUrl: string,
  dbType: CatalystDbType,
  root: Buffer,
  components: Components<"catalystDbProvider">
): Promise<void> {
  const stateDb = await components.catalystDbProvider.getDb()
  const rootHex = root.toString("hex")
  await stateDb.put(getDbName(serverUrl, dbType) + "-root", rootHex)
  console.log("put", serverUrl, dbType, "root", rootHex)
}
