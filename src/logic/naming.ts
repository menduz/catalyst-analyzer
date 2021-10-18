

export const basepathDeployments = `content/deployments`


export function normalizeServerDomain(domain: string): string {
  const ret = domain
    .replace(/^(.+:\/\/)/, "")
    .replace(/([^A-Z0-9.-])/gi, "-")
    .replace(/\--+|\-$/g, "")
    .trim()
  if (!ret) throw new Error("Invalid server name: " + domain)
  return ret
}