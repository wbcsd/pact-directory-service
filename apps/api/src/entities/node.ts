import { NodeData, NodeStatus, NodeType } from "@src/services/node-service";

export class NodeInstance implements NodeData {
  id: number;
  name: string;
  organizationId: number;
  organizationName?: string;
  apiUrl?: string;
  status: NodeStatus;
  type: NodeType;
  createdAt: Date;
  updatedAt: Date;

  static fromNodeData(data: NodeData): NodeInstance {
    return new NodeInstance(data);
  }

  constructor(data: NodeData) {

    if (data.type === 'external' && !data.apiUrl) {
      throw new Error("External nodes must have an apiUrl");
    }

    this.id = data.id;
    this.name = data.name;
    this.organizationId = data.organizationId;
    this.organizationName = data.organizationName;
    this.apiUrl = data.apiUrl;
    this.status = data.status;
    this.type = data.type;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  async getFootprints() {
    // Implementation for getting footprints
    throw new Error("Method not implemented.");
  }

  async getFootprintById(footprintId: number) {
    // Implementation for getting a specific footprint by ID
    throw new Error("Method not implemented.");
  }

  async requestFootprints(node: NodeInstance) {
    throw new Error("Method not implemented.");
  }

  async requestFootprintById(node: NodeInstance, footprintId: number) {
    throw new Error("Method not implemented.");
  }

  async sendEvent() {
    throw new Error("Method not implemented.");
  }

  async processEvent() {
    throw new Error("Method not implemented.");
  }

}

export default NodeInstance;