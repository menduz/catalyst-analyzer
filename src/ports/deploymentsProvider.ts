import { DeploymentWithMetadataContentAndPointers } from "dcl-catalyst-client";
import { DeploymentWithAuditInfo } from 'dcl-catalyst-commons';

export interface IDeploymentsProviderComponent {
  receiveDeployment(deployment: DeploymentWithMetadataContentAndPointers & DeploymentWithAuditInfo, server: string): Promise<void>
  getDeployments(server: string): AsyncIterator<DeploymentWithMetadataContentAndPointers & DeploymentWithAuditInfo>
}