// Function Registry for Extensible Expression Engine

class FunctionRegistry {
    constructor() {
        this.functions = {};
    }

    register(name, fn, description = "") {
        this.functions[name.toLowerCase()] = { fn, description };
    }

    get(name) {
        const entry = this.functions[name.toLowerCase()];
        if (!entry) {
            throw new Error(`Function '${name}' not found`);
        }
        return entry.fn;
    }

    list() {
        return Object.keys(this.functions);
    }
}

export const registry = new FunctionRegistry();

// Helper to register functions easily
export const registerFunction = (name, fn, description) => registry.register(name, fn, description);
