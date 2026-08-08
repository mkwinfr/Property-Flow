export const attachmentMimeExtensions: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
};

export const portalPhotoMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;

export const portalDocumentMimeTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;

export type AttachmentEntityType =
  | "turn"
  | "turn_item"
  | "work_order"
  | "inspection"
  | "inspection_item"
  | "appliance"
  | "lease"
  | "household";
