import { createDotEnvConfigComponent } from "@well-known-components/env-config-provider"
import { createServerComponent, createStatusCheckComponent } from "@well-known-components/http-server"
import { createLogComponent } from "@well-known-components/logger"
import { createFetchComponent } from "./ports/fetch"
import { createMetricsComponent } from "@well-known-components/metrics"
import { AppComponents, GlobalContext } from "./types"
import { metricDeclarations } from "./metrics"
import { createDeploymentsProviderComponent } from "./ports/deploymentsProvider"
import { createCatalystDbProviderComponent } from "./ports/catalystDbProvider"

// Initialize all the components of the app
export async function initComponents(): Promise<AppComponents> {
  const config = await createDotEnvConfigComponent({})

  const logs = createLogComponent()
  const server = await createServerComponent<GlobalContext>({ config, logs }, {})
  const statusChecks = await createStatusCheckComponent({ server, config })
  const fetch = await createFetchComponent()
  const metrics = await createMetricsComponent(metricDeclarations, { server, config })
  const catalystDbProvider = await createCatalystDbProviderComponent()
  const deploymentsProvider = await createDeploymentsProviderComponent({ logs, catalystDbProvider })

  return {
    config,
    logs,
    server,
    statusChecks,
    fetch,
    metrics,
    deploymentsProvider,
    catalystDbProvider,
  }
}
