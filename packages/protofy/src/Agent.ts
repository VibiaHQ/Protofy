import { SchemaObject, Ajv } from "ajv";
import { z } from "zod";

// Compile a generic JSON Schema validator using Ajv
const ajv = new Ajv();
const validateSchemaObject = ajv.compile({ type: "object" });

const AgentProtocolSchema = z.object({
    type: z.string(), // function, http-request, http-response, mqtt-message
    serializer: z.string().optional(), // json, xml, none (for local function calls)
    encoder: z.string().optional(), // body, query, path, arguments, ...
    params: z.record(z.any()).optional(), //protocol-specific configs host, port, topic, path...
})

const AgentInterfaceSchema = z.object({
    shape: z.custom<SchemaObject>((value) => {
        // Use Ajv to validate the value
        return validateSchemaObject(value);
    }, "SchemaObject"),
    protocol: AgentProtocolSchema.optional()
})

const AgentSchema = z.object({
    id: z.string(), // Required string
    name: z.string().optional(), // Optional string
    description: z.string().optional(), // Optional string
    tags: z.array(z.string()).optional(), // Optional array of strings
    protocol: AgentProtocolSchema.optional(),
    input: AgentInterfaceSchema.optional(),
    output: AgentInterfaceSchema.optional()
})

// Infer the TypeScript type
export type AgentData = z.infer<typeof AgentSchema>;
export type AgentProtocolData = z.infer<typeof AgentProtocolSchema>;
export type AgentInterfaceData = z.infer<typeof AgentInterfaceSchema>;

export class Agent {
    data: AgentData;
    children: Agent[];
    input: AgentInterface | undefined;
    output: AgentInterface | undefined;
    constructor(data: AgentData, agents: Agent[] = []) {
        this.data = data;
        this.children = agents;
        this.input = data.input && new AgentInputInterface(data.input, this);
        this.output = data.output && new AgentOutputInterface(data.output, this);
    }

    getName() {
        return this.data.name
    }

    getId() {
        return this.data.id
    }

    getDescription() {
        return this.data.description
    }

    getTags() {
        return this.data.tags
    }

    getProtocol() {
        return this.data.protocol
    }

    getInputShape() {
        return this.input?.getShape()
    }

    getInputProtocol() {
        return this.input?.getProtocol()
    }

    getOutputShape() {
        return this.output?.getShape()
    }

    getOutputProtocol() {
        return this.output?.getProtocol()
    }

    addChildren(agents: Agent[]) {
        this.children.push(...agents);
    }

    getChildren() {
        return this.children;
    }

    addChild(agent: Agent) {
        this.children.push(agent);
    }

    getChild(id: string) {
        return this.children && this.children.find(agent => agent.data.id === id);
    }
}

export class AgentInterface {
    shape: SchemaObject;
    protocol: AgentProtocolData;
    agent: Agent;
    constructor(data: AgentInterfaceData, agent: Agent) {
        this.shape = data.shape;
        this.protocol = data.protocol;
        this.agent = agent;
    }

    getShape() {
        return this.shape;
    }

    getProtocol() {
        return {
            ...this.agent.getProtocol(),
            ...this.protocol
        }
    }
}

export class AgentInputInterface extends AgentInterface {
    constructor(data: AgentInterfaceData, agent: Agent) {
        super(data, agent);
    }
}

export class AgentOutputInterface extends AgentInterface {
    constructor(data: AgentInterfaceData, agent: Agent) {
        super(data, agent);
    }
}