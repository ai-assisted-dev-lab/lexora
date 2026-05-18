import { useEffect, useState } from "react";

import {
  type SchemaVersionDto,
  getSchemaVersion,
} from "@/services/commands/db";

export function useSchemaVersion(): SchemaVersionDto | null {
  const [schema, setSchema] = useState<SchemaVersionDto | null>(null);

  useEffect(() => {
    getSchemaVersion().then(setSchema).catch(() => {});
  }, []);

  return schema;
}
