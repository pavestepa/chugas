import { Types, type SchemaOptions } from "mongoose";

export function serializeObjectIds(value: unknown): unknown {
  if (value instanceof Types.ObjectId) {
    return value.toString();
  }

  if (value instanceof Date) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(serializeObjectIds);
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        serializeObjectIds(nestedValue),
      ])
    );
  }

  return value;
}

export function jsonTransform(
  _doc: unknown,
  ret: Record<string, unknown>
): Record<string, unknown> {
  const { __v, _id, ...rest } = ret;
  void __v;

  return serializeObjectIds({
    _id: String(_id),
    ...rest,
  }) as Record<string, unknown>;
}

export const defaultSchemaOptions = {
  timestamps: true,
  toJSON: {
    transform: jsonTransform,
  },
} satisfies Pick<SchemaOptions, "timestamps" | "toJSON">;

export const toJson = <T>(doc: { toJSON: () => T }): T => doc.toJSON();
