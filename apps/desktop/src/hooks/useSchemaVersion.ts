import { useEffect, useState } from "react";

import {
  getSchemaVersion,
  type SchemaVersionDto,
} from "@/services/commands/db";

export function useSchemaVersion(): SchemaVersionDto | null {
  const [schema, setSchema] = useState<SchemaVersionDto | null>(null);

  useEffect(() => {
    getSchemaVersion()
      .then(setSchema)
      .catch(() => {});
  }, []);

  return schema;
}
