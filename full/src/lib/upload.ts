import type { FileUIPart } from "ai";

type Ticket = {
  filename: string;
  mediaType: string;
  uploadUrl: string;
  url: string;
};

/** Upload files, then return AI SDK `file` parts for `sendMessage`. */
export async function uploadChatFiles(
  uploadUrl: string,
  files: File[],
): Promise<FileUIPart[]> {
  if (files.length === 0) return [];

  const ticketRes = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      files: files.map((file) => ({
        filename: file.name || "file",
        mediaType: file.type || "application/octet-stream",
        size: file.size,
      })),
    }),
  });
  const ticket = (await ticketRes.json()) as {
    ok?: boolean;
    error?: string;
    uploads?: Ticket[];
  };
  if (!ticketRes.ok || !ticket.ok || !ticket.uploads) {
    throw new Error(ticket.error ?? "Could not start upload");
  }

  await Promise.all(
    ticket.uploads.map(async (target, index) => {
      const file = files[index];
      if (!file) return;
      const put = await fetch(target.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": target.mediaType },
        body: file,
      });
      if (!put.ok) {
        throw new Error(`Upload failed for ${target.filename}`);
      }
    }),
  );

  return ticket.uploads.map((target) => ({
    type: "file",
    mediaType: target.mediaType,
    filename: target.filename,
    url: target.url,
  }));
}
