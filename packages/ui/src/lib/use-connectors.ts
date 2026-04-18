import { useCallback, useEffect, useState } from "react";
import type { Connector } from "./types";

export function useConnectors(filter?: (c: Connector) => boolean) {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const res = await fetch("/api/connectors");
    const data: Connector[] = await res.json();
    setConnectors(filter ? data.filter(filter) : data);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { connectors, loading, refetch };
}
