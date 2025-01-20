import { Database, Statement } from "bun:sqlite";
import { randomUUID } from "crypto";
import { z } from "zod";

export const PhotoSchema = z.object({
  id: z.string().default(randomUUID),
  external: z.boolean().default(false),
  favorite: z.boolean().default(false),
  mime: z.string().refine((mime) => mime.startsWith("image/")),
  data: z.custom<Uint8Array>((data) => data instanceof Uint8Array).optional(),
  url: z.string().optional(),
});

export type Photo = z.infer<typeof PhotoSchema>;

class PhotoDB {
  private db: Database;
  private insertStmt: Statement<Photo, any[]>;
  private updateStmt: Statement<Photo, string[]>;
  private allStmt: Statement<Photo, never[]>;
  constructor() {
    this.db = new Database("photos.dev.sqlite");
    this.db.exec("PRAGMA journal_mode = WAL;");
    this.db.exec(`
      CREATE TABLE if not exists photos (
        id TEXT PRIMARY KEY,
        external BOOLEAN NOT NULL,
        favorite INTEGER NOT NULL,
        mime TEXT NOT NULL,
        data BLOB,
        url TEXT
      );
    `);
    this.allStmt = this.db.query(`SELECT * FROM photos;`);
    this.insertStmt = this.db.prepare(
      `INSERT into photos values (:id, :external, :favorite, :mime, :data, :url) returning *;`
    );
    this.updateStmt = this.db.prepare(`UPDATE photos SET favorite = NOT favorite WHERE id = :id returning *;`);
  }

  public insert(photo: Photo): Photo | null {
    return this.insertStmt.get(photo.id, photo.external, photo.favorite, photo.mime, photo.data, photo.url);
  }

  public all(): Photo[] {
    return this.allStmt.all();
  }

  public update(id: string): Photo | null {
    return this.updateStmt.get(id);
  }

  public query(sql: string) {
    return this.db.prepare(sql);
  }
}

export default new PhotoDB();
