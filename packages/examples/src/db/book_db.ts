import { Database, Statement } from "bun:sqlite";
import { randomUUID } from "crypto";
import { z } from "zod";

// Create the zod BookSchema
export const BookSchema = z.object({
  id: z.string().default(randomUUID),
  name: z.string().min(2).max(100),
  author: z.string().min(4).max(100),
  checked_out: z.boolean().default(false),
});

// Infer the Book type from the BookSchema
export type Book = z.infer<typeof BookSchema>;

class BookDB {
  private db: Database;
  private insertStmt: Statement<Book, any[]>;
  private updateStmt: Statement<Book, string[]>;
  private allStmt: Statement<never, Book[]>;
  constructor() {
    this.db = new Database("books.dev.sqlite");
    this.db.exec("PRAGMA journal_mode = WAL;");
    this.db.exec(`
      CREATE TABLE if not exists books (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        author TEXT NOT NULL,
        checked_out INTEGER NOT NULL
      );  
    `);
    this.allStmt = this.db.query(`SELECT * FROM books;`);
    this.insertStmt = this.db.prepare(`Insert into books values (:id, :name, :author, :checked_out) returning *;`);
    this.updateStmt = this.db.prepare(`UPDATE books SET checked_out = NOT checked_out WHERE id = :id returning *;`);
  }

  public insert(book: Partial<Book>): Book | null {
    return this.insertStmt.get(book.id, book.name, book.author, book.checked_out);
  }

  public all(): Book[] {
    return this.allStmt.all();
  }

  public update(id: string): Book | null {
    return this.updateStmt.get(id);
  }

  public query(sql: string) {
    return this.db.prepare(sql);
  }
}

export default new BookDB();
