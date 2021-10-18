import { IBaseComponent } from "@well-known-components/interfaces"
import level from "level"
import future from "fp-future"
import { CheckpointTrie } from "merkle-patricia-tree"
import { basepathDeployments, normalizeServerDomain } from "../logic/naming"

export type CatalystDbType = "deployments" | "state"

export interface ICatalystDbProvider {
  getDb(): Promise<level.LevelDB<string, string>>
  getCatalystDb(serverUrl: string, dbType: CatalystDbType, root: Buffer | undefined): Promise<CheckpointTrie>
}

export async function createCatalystDbProviderComponent(): Promise<ICatalystDbProvider & IBaseComponent> {
  const dbMap = new Map<string, level.LevelDB>()

  function getDbPath(serverUrl: string, dbType: string) {
    const norm = normalizeServerDomain(serverUrl)
    return basepathDeployments + "/level-" + norm + "-" + dbType
  }

  const stateDb = future<level.LevelDB<string, string>>()

  return {
    getDb: () => stateDb,
    async getCatalystDb(serverUrl, dbType, root) {
      const filename = getDbPath(serverUrl, dbType)
      let levelDbInstance = dbMap.get(filename)
      if (!levelDbInstance) {
        levelDbInstance = await new Promise<level.LevelDB>((resolve, reject) => {
          const levelDbInstance = level(filename, undefined, (err) => {
            if (err) {
              reject(err)
            } else {
              resolve(levelDbInstance)
            }
          })
        })
        dbMap.set(filename, levelDbInstance)
      }
      return new CheckpointTrie(levelDbInstance, root || undefined)
    },
    async stop() {
      // for (const [, db] of dbMap) {
      //   await db.commit()
      // }
    },
    async start() {
      const levelDbInstance = level(basepathDeployments + "/state", undefined, (err) => {
        if (err) {
          stateDb.reject(err)
        } else {
          stateDb.resolve(levelDbInstance)
        }
      })
      await stateDb
    },
  }
}
