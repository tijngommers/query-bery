//@author Tijn Gommers
//@date 2026-03-31

interface StorageAdapter {
    read(table: string): Promise<Record<string, any>[]>;
    write(table: string, rows: Record<string, any>[]): Promise<void>;
    delete(table: string, condition: (row: Record<string, any>) => boolean): Promise<void>;
    update(table: string, condition: (row: Record<string, any>) => boolean, updates: Partial<Record<string, any>>): Promise<void>;
}