import { randomUUID } from "crypto";
import { readFileSync } from "node:fs";
import { mime } from "../../mime";
// import type { PhxEventUpload } from "../protocol/phx";
import type { AllowUploadEntry } from "../protocol/payloads";
import { UploadConfig } from "./uploadConfig";

export type PhxEventUpload = {
  path: string; // config path
  last_modified: number; // ts of last modified
  ref: string; // order of upload
  name: string; // original filename
  type: string; // mime type
  size: number; // bytes
};

/**
 * UploadEntry represents a file and related metadata selected for upload
 */
export interface UploadEntry {
  /**
   * Whether the file selection has been cancelled. Defaults to false.
   */
  cancelled: boolean;
  /**
   * The timestamp when the file was last modified from the client's file system
   */
  last_modified: number;
  /**
   * The name of the file from the client's file system
   */
  name: string;
  /**
   * The size of the file in bytes from the client's file system
   */
  size: number;
  /**
   * The mime type of the file from the client's file system
   */
  type: string;
  /**
   * True if the file has been uploaded. Defaults to false.
   */
  done: boolean;
  /**
   * True if the file has been auto-uploaded. Defaults to false.
   */
  preflighted: boolean;
  /**
   * The integer percentage of the file that has been uploaded. Defaults to 0.
   */
  progress: number;
  /**
   * The unique instance ref of the upload entry
   */
  ref: string;
  /**
   * The unique instance ref of the upload config to which this entry belongs
   */
  upload_ref: string;
  /**
   * A uuid for the file
   */
  uuid: string;
  /**
   * True if there are no errors with the file. Defaults to true.
   */
  valid: boolean;
  /**
   * Errors that have occurred during selection or upload.
   */
  errors: string[];
  /**
   * The data of the file being uploaded
   */
  readonly data: Buffer;
}

/**
 * UploadEntry represents a file and related metadata selected for upload
 */
export class DefaultUploadEntry implements UploadEntry {
  #config: UploadConfig; // the parent upload config
  #tempFile?: string; // the temp file location where the file is stored

  constructor(upload: PhxEventUpload | AllowUploadEntry, config: UploadConfig) {
    this.cancelled = false;
    this.last_modified = upload.last_modified;
    this.name = upload.name;
    this.size = upload.size;
    this.type = upload.type;
    this.done = false;
    this.preflighted = false;
    this.progress = 0;
    this.ref = upload.ref;
    this.upload_ref = config.ref;
    this.uuid = randomUUID();
    this.errors = [];
    this.valid = true;
    this.#config = config;
    this.validate();
  }
  cancelled: boolean;
  last_modified: number;
  name: string;
  size: number;
  type: string;
  done: boolean;
  preflighted: boolean;
  progress: number;
  ref: string;
  upload_ref: string;
  uuid: string;
  valid: boolean;
  errors: string[];

  /**
   * Takes in a progress percentage and updates the entry accordingly
   * @param progress
   */
  updateProgress(progress: number) {
    if (progress < 0) {
      progress = 0;
    }
    if (progress > 100) {
      progress = 100;
    }
    this.progress = progress;
    this.preflighted = progress > 0;
    this.done = progress === 100;
  }

  /**
   * Validates the file against the upload config
   */
  validate() {
    this.errors = [];

    // validate file size
    if (this.size > this.#config.max_file_size) {
      this.errors.push("Too large");
    }

    // validate mime type is allowed
    if (this.#config.accept.length > 0) {
      // client type is a mime type but accept list can be either a mime type or extension
      // https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/file#unique_file_type_specifiers
      let allowed = false;
      for (let i = 0; i < this.#config.accept.length; i++) {
        const acceptItem = this.#config.accept[i];
        if (acceptItem.startsWith(".")) {
          // extension so look up mime type (first trim off the leading dot)
          const mimeTypes = mime.lookupMimeType(acceptItem.slice(1));
          if (mimeTypes.includes(this.type)) {
            allowed = true;
            break;
          }
        } else {
          // mime type so check if it matches
          if (acceptItem === this.type) {
            allowed = true;
            break;
          }
        }
      }
      if (!allowed) {
        this.errors.push("Not allowed");
      }
    }
    this.valid = this.errors.length === 0;
  }

  /**
   * Sets the temp file path for the entry, used internally
   * @param tempFilePath a path to the temp file
   */
  setTempFile(tempFilePath: string) {
    this.#tempFile = tempFilePath;
  }

  /**
   * Gets the temp file path for the entry, used internally
   * @returns the temp file path
   */
  getTempFile() {
    return this.#tempFile;
  }

  get data() {
    if (!this.done) {
      return Buffer.from([]);
    }
    return readFileSync(this.#tempFile!);
  }
}
