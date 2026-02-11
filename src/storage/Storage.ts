import { StorageError } from "../util/Error";

export interface StorageOperation {
    type: "set" | "delete";
    key: string;
    value?: Buffer;
}

export interface Storage {
    get(key: string): Promise<Buffer | null>;
    set(key: string, value: Buffer): Promise<void>;
    delete(key: string): Promise<void>;
    batch(operations: StorageOperation[]): Promise<void>;
    open(): Promise<void>;
    close(): Promise<void>;
    isOpen(): boolean;
}

export class InMemoryStorage implements Storage {
    private data: Map<string, Buffer> = new Map();
    private isOpenFlag: boolean = false;

    async open(): Promise<void> {
        if (this.isOpenFlag) {
            throw new StorageError("Storage is already open");
        }
        this.isOpenFlag = true;
    }

    async close(): Promise<void> {
        this.ensureOpen();
        this.isOpenFlag = false;
    }

    private ensureOpen() {
        if (!this.isOpenFlag) {
            throw new StorageError("Storage is not open");
        }
    }

    isOpen(): boolean {
        return this.isOpenFlag;
    }

    async get(key: string): Promise<Buffer | null> {
        this.ensureOpen();
        return this.data.get(key) || null;
    }

    async set(key: string, value: Buffer): Promise<void> {
        this.ensureOpen();
        this.data.set(key, Buffer.from(value));
    }

    async delete(key: string): Promise<void> {
        this.ensureOpen();
        this.data.delete(key);
    }

    async batch(operations: StorageOperation[]): Promise<void> {
        this.ensureOpen();

        for (const operation of operations) {
            if (operation.type === "set" && !operation.value) {
                throw new StorageError("Value is required for set operation");
            }
        }

        const tempData = new Map(this.data);

        try {
            for (const operation of operations) {
                if (operation.type === "set") {
                    tempData.set(operation.key, Buffer.from(operation.value!));
                } else if (operation.type === "delete") {
                    tempData.delete(operation.key);
                } else {
                    throw new StorageError(`Invalid operation type: ${operation.type}`);
                }
            }

            this.data = tempData;
        } catch (error) {
            throw new StorageError(`Batch operation failed: ${error instanceof Error ? error.message : String(error)}`);
        };
    }

    keys(): string[] {
        this.ensureOpen();
        return Array.from(this.data.keys());
    }

    clear(): void {
        this.ensureOpen();
        this.data.clear();
    }

    size(): number {
        this.ensureOpen();
        return this.data.size;
    }
}