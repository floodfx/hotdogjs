import { randomUUID } from "crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Template } from "../../template";
import type { WsViewContext } from "../../view/context";
import { Phx } from "../protocol/phx";
import { PhxReply } from "../protocol/reply";
import { UploadConfig, type ExternalMetadata } from "./uploadConfig";
import { DefaultUploadEntry } from "./uploadEntry";

function tempPath(lastPathPart: string): string {
  // ensure the temp directory exists
  const tempDir = path.join(os.tmpdir(), "com.hotdogjs.files");
  if (!existsSync(tempDir)) {
    mkdirSync(tempDir);
  }
  return path.join(tempDir, lastPathPart);
}
function writeTempFile(dest: string, data: Buffer) {
  writeFileSync(dest, data);
}
function createOrAppendFile(dest: string, src: string) {
  // @ts-ignore - https://github.com/oven-sh/bun/issues/14892
  appendFileSync(dest, readFileSync(src));
}

export async function onUploadBinary(ctx: WsViewContext, msg: Phx.Msg<Buffer>): Promise<PhxReply.Reply[]> {
  // generate a random temp file path
  const randomTempFilePath = tempPath(randomUUID());

  const [joinRef, msgRef, topic, event, payload] = msg;

  writeTempFile(randomTempFilePath, payload);

  // split topic to get uploadRef
  const ref = topic.split(":")[1];

  // get activeUploadConfig by this.activeUploadRef
  const activeUploadConfig = Object.values(ctx.uploadConfigs).find((c) => c.ref === ctx.activeUploadRef);
  if (activeUploadConfig) {
    // find entry from topic ref
    const entry = activeUploadConfig.entries.find((e) => e.ref === ref) as DefaultUploadEntry;
    if (!entry) {
      throw Error(`Could not find entry for ref ${ref} in uploadConfig ${JSON.stringify(activeUploadConfig)}`);
    }

    // use fileSystemAdaptor to get path to a temp file
    const entryTempFilePath = tempPath(entry.uuid);
    // create or append to entry's temp file
    createOrAppendFile(entryTempFilePath, randomTempFilePath);
    // tell the entry where it's temp file is
    entry.setTempFile(entryTempFilePath);
  }

  let returnDiff = true;
  Object.keys(ctx.uploadConfigs).forEach((key) => {
    const config = ctx.uploadConfigs[key];
    // match upload config on the active upload ref
    if (config.ref === ctx.activeUploadRef) {
      // check if ref progress > 0
      config.entries.forEach((entry) => {
        if (entry.ref === ref) {
          // only return diff if entry ref progress is 0
          returnDiff = entry.progress === 0;
        }
      });
    }
  });
  const replies = [];
  if (returnDiff) {
    replies.push(PhxReply.diff(joinRef, ctx.joinId, {}));
  }

  const m: Phx.Msg = [joinRef, msgRef, topic, event, {}];
  replies.push(PhxReply.renderedReply(m, {}));
  return replies;
}

export async function onProgressUpload(ctx: WsViewContext, payload: Phx.ProgressUploadPayload): Promise<Template> {
  const { ref, entry_ref, progress } = payload;

  // iterate through uploadConfigs and find the one that matches the ref
  const uploadConfig = Object.values(ctx.uploadConfigs).find((config) => config.ref === ref);
  if (uploadConfig) {
    uploadConfig.entries = uploadConfig.entries.map((entry) => {
      if (entry.ref === entry_ref) {
        (entry as DefaultUploadEntry).updateProgress(progress);
      }
      return entry;
    });
    ctx.uploadConfigs[uploadConfig.name] = uploadConfig;
  } else {
    // istanbul ignore next
    console.error("Received progress upload but could not find upload config for ref", ref);
  }

  return await ctx.view.render({
    csrfToken: ctx.csrfToken,
    uploads: ctx.uploadConfigs,
  });
}

export type AllowUploadEntries = { [key: string]: string | ExternalMetadata };
export type AllowUploadResult = {
  entries: AllowUploadEntries;
  config: UploadConfig;
  view: Template;
};
export async function onAllowUpload(ctx: WsViewContext, payload: Phx.AllowUploadPayload): Promise<AllowUploadResult> {
  const { ref, entries } = payload;

  ctx.activeUploadRef = ref;
  const uc = Object.values(ctx.uploadConfigs).find((c) => c.ref === ref);
  if (!uc) {
    throw Error(`Could not find upload config for ref ${ref}`);
  }

  // update entriesReply with direct or external upload data
  const entriesReply: { [key: string]: string | ExternalMetadata } = {
    ref,
  };
  // set new DefaultUploadEntry for each entry in the upload config
  uc.entries = entries.map((entry) => new DefaultUploadEntry(entry, uc));
  entries.forEach(async (entry, i) => {
    const uuid = uc.entries[i].uuid;
    try {
      // this reply ends up been the "token" for the onPhxJoinUpload
      if (!uc.external) {
        // send back JSON stringified entry
        entriesReply[entry.ref] = JSON.stringify(entry);
      } else {
        // send back the external URL
        entriesReply[entry.ref] = await uc.external({ uuid, ...entry });
      }
    } catch (e) {
      // istanbul ignore next
      console.error("Error serializing entry", e);
    }
  });

  const view = await ctx.view.render({
    csrfToken: ctx.csrfToken,
    uploads: ctx.uploadConfigs,
  });
  return {
    entries: entriesReply,
    config: uc,
    view,
  };
}
