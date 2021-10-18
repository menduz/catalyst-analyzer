import { Readable } from "stream"
import { getStateRoot } from "../../logic/state"
import { HandlerContextWithPath } from "../../types"

// handlers arguments only type what they need, to make unit testing easier
export async function rehash(
  context: HandlerContextWithPath<"catalystDbProvider", "/catalyst/audit/merkle/:catalystDomain/rehash">
) {
  const {
    components,
    params: { catalystDomain },
  } = context

  const server = `https://${catalystDomain}/content`

  const root = await getStateRoot(server, "deployments", components)

  if (!root) return { status: 404 }

  const db = await components.catalystDbProvider.getCatalystDb(server, "deployments", root)

  async function* readValues() {
    // const stream = new Readable({ objectMode: true })
    // db._findValueNodes((nodeRef, node, key, walkController) => {
    //   stream.push(node)
    // })
    //   .then(() => stream.destroy())
    //   .catch((err) => {
    //     stream.destroy(err)
    //   })
    const stream = db.createReadStream() as any

    for await (const it of stream) {
      console.log(it.key.toString())
      yield it.value.toString()
    }

    stream.destroy()
  }

  return {
    body: Readable.from(readValues()),
  }
}
